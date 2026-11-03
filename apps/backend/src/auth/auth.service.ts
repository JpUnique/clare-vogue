import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { isAuthError } from '@supabase/supabase-js';
import { DatabaseService } from '../database/database.service.js';
import type { UsernameSignUpDto } from './auth.dto.js';
import type { SupabaseAuthClient } from './auth.types.js';
import type { AuthenticatedUser } from './authenticated-user.js';
import { verifySupabaseIdentity } from './authenticated-user.js';

const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const phonePattern = /^\+[1-9][0-9]{7,14}$/;

@Injectable()
export class AuthService {
  constructor(
    private readonly client: SupabaseAuthClient | null,
    private readonly database: DatabaseService,
  ) {}

  async authenticate(accessToken: string): Promise<AuthenticatedUser> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Authentication is not configured.',
      );
    }

    let claimsResult: Awaited<
      ReturnType<SupabaseAuthClient['auth']['getClaims']>
    >;
    try {
      claimsResult = await this.client.auth.getClaims(accessToken);
    } catch (error) {
      this.throwProviderFailure(error);
    }

    if (claimsResult.error || !claimsResult.data) {
      this.throwProviderFailure(claimsResult.error);
    }

    let userResult: Awaited<ReturnType<SupabaseAuthClient['auth']['getUser']>>;
    try {
      userResult = await this.client.auth.getUser(accessToken);
    } catch (error) {
      this.throwProviderFailure(error);
    }

    if (userResult.error || !userResult.data.user) {
      this.throwProviderFailure(userResult.error);
    }

    return verifySupabaseIdentity(
      claimsResult.data.claims,
      userResult.data.user,
      this.client.issuer,
    );
  }

  async signInWithUsername(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const client = this.getClient();
    const email = await this.resolveAuthIdentifierEmail(username);
    if (!email) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    let result: Awaited<
      ReturnType<SupabaseAuthClient['auth']['signInWithPassword']>
    >;
    try {
      result = await client.auth.signInWithPassword({ email, password });
    } catch (error) {
      this.throwSignInFailure(error);
    }

    if (result.error) {
      this.throwSignInFailure(result.error);
    }
    if (!result.data.session) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    return {
      accessToken: result.data.session.access_token,
      refreshToken: result.data.session.refresh_token,
    };
  }

  async signUpWithUsername(input: UsernameSignUpDto): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    confirmationRequired: boolean;
  }> {
    const client = this.getClient();
    if (!client.admin) {
      throw new ServiceUnavailableException(
        'Username authentication is not configured.',
      );
    }

    const username = input.username.trim().toLowerCase();
    if (!(await this.isUsernameAvailable(username))) {
      throw new ConflictException('That username is already in use.');
    }

    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const phone = input.phone.trim();
    let result: Awaited<ReturnType<SupabaseAuthClient['auth']['signUp']>>;
    try {
      result = await client.auth.signUp({
        email,
        password: input.password,
        options: {
          data: { username, full_name: fullName, phone },
        },
      });
    } catch (error) {
      this.throwSignUpFailure(error);
    }
    if (result.error) {
      this.throwSignUpFailure(result.error);
    }
    if (!result.data.user) {
      throw new ServiceUnavailableException(
        'The authentication provider did not return the new account.',
      );
    }

    await this.registerAuthAccountProfile(result.data.user.id, {
      username,
      email,
      fullName,
      phone,
    });

    const session = result.data.session;
    return {
      accessToken: session?.access_token ?? null,
      refreshToken: session?.refresh_token ?? null,
      confirmationRequired: session === null,
    };
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const email = await this.database.resolveAuthAccountEmail(
      username.trim().toLowerCase(),
    );
    return email === null;
  }

  async requestUsernamePasswordReset(username: string): Promise<void> {
    const client = this.getClient();
    const email = await this.resolveAuthIdentifierEmail(username);
    if (!email) return;

    let result: Awaited<
      ReturnType<SupabaseAuthClient['auth']['resetPasswordForEmail']>
    >;
    try {
      result = await client.auth.resetPasswordForEmail(email);
    } catch (error) {
      this.throwProviderFailure(error);
    }
    if (result.error) {
      this.throwProviderFailure(result.error);
    }
  }

  private async registerAuthAccountProfile(
    userId: string,
    expected: {
      username: string;
      email: string;
      fullName: string;
      phone: string;
    },
  ): Promise<void> {
    const client = this.getClient();
    if (!client.admin) {
      throw new ServiceUnavailableException(
        'Username authentication is not configured.',
      );
    }

    let result: Awaited<
      ReturnType<NonNullable<SupabaseAuthClient['admin']>['getUserById']>
    >;
    try {
      result = await client.admin.getUserById(userId);
    } catch (error) {
      this.throwAdminFailure(error);
    }
    if (result.error || !result.data.user) {
      this.throwAdminFailure(result.error);
    }

    const user = result.data.user;
    const metadata = user.user_metadata;
    const username =
      typeof metadata.username === 'string'
        ? metadata.username.trim().toLowerCase()
        : '';
    const fullName =
      typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
    const phone =
      typeof metadata.phone === 'string' ? metadata.phone.trim() : '';
    const email = user.email?.trim() ?? '';

    if (
      !email ||
      !usernamePattern.test(username) ||
      fullName.length === 0 ||
      fullName.length > 200 ||
      !phonePattern.test(phone) ||
      user.email?.trim().toLowerCase() !== expected.email ||
      username !== expected.username ||
      fullName !== expected.fullName ||
      phone !== expected.phone
    ) {
      throw new BadRequestException(
        'The new account details could not be verified.',
      );
    }

    try {
      await this.database.registerAuthAccountProfile({
        userId: user.id,
        username,
        email,
        fullName,
        phone,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('That username is already in use.');
      }
      throw error;
    }
  }

  private async resolveAuthIdentifierEmail(
    identifier: string,
  ): Promise<string | null> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    if (normalizedIdentifier.includes('@')) return normalizedIdentifier;
    return this.database.resolveAuthAccountEmail(normalizedIdentifier);
  }

  private throwAdminFailure(error: unknown): never {
    if (isAuthError(error)) {
      if (
        error.status !== undefined &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      ) {
        throw new BadRequestException('The account could not be verified.');
      }

      throw new ServiceUnavailableException(
        'Authentication provider is unavailable.',
      );
    }

    if (error === null) {
      throw new BadRequestException('The account could not be verified.');
    }

    throw new ServiceUnavailableException(
      'Authentication provider is unavailable.',
    );
  }

  private throwSignUpFailure(error: unknown): never {
    if (isAuthError(error)) {
      if (
        error.status !== undefined &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      ) {
        throw new BadRequestException(
          'Unable to create the account. Check the details or sign in instead.',
        );
      }

      throw new ServiceUnavailableException(
        'Authentication provider is unavailable.',
      );
    }

    throw new ServiceUnavailableException(
      'Authentication provider is unavailable.',
    );
  }

  private throwProviderFailure(error: unknown): never {
    if (isAuthError(error)) {
      if (
        error.status !== undefined &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      ) {
        throw new UnauthorizedException('The access token is invalid.');
      }

      throw new ServiceUnavailableException(
        'Authentication provider is unavailable.',
      );
    }

    if (error === null) {
      throw new UnauthorizedException('The access token is invalid.');
    }

    throw new ServiceUnavailableException(
      'Authentication provider is unavailable.',
    );
  }

  private throwSignInFailure(error: unknown): never {
    if (isAuthError(error)) {
      if (
        error.status !== undefined &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      ) {
        throw new UnauthorizedException('Invalid username or password.');
      }

      throw new ServiceUnavailableException(
        'Authentication provider is unavailable.',
      );
    }

    if (error === null) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    throw new ServiceUnavailableException(
      'Authentication provider is unavailable.',
    );
  }

  private getClient(): SupabaseAuthClient {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Authentication is not configured.',
      );
    }
    return this.client;
  }
}
