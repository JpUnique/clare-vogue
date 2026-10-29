import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { isAuthError } from '@supabase/supabase-js';
import type { SupabaseAuthClient } from './auth.types.js';
import type { AuthenticatedUser } from './authenticated-user.js';
import { verifySupabaseIdentity } from './authenticated-user.js';

@Injectable()
export class AuthService {
  constructor(private readonly client: SupabaseAuthClient | null) {}

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
}
