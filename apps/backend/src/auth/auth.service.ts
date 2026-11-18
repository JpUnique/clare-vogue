import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service.js';
import type { UsernameSignUpDto } from './auth.dto.js';

const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const phonePattern = /^\+[1-9][0-9]{7,14}$/;

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async signInWithUsername(
    username: string,
    password: string,
  ): Promise<{ userId: string; username: string; email: string }> {
    const normalizedUsername = username.trim().toLowerCase();
    const email = await this.resolveAuthIdentifierEmail(normalizedUsername);

    if (!email) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    // TODO: Implement database query to fetch user by email and verify password hash
    // This requires querying the authAccountProfiles table with password_hash
    throw new ServiceUnavailableException(
      'Sign-in functionality requires database schema migration and email service setup.',
    );
  }

  async signUpWithUsername(input: UsernameSignUpDto): Promise<{
    userId: string;
    confirmationRequired: boolean;
  }> {
    const username = input.username.trim().toLowerCase();
    if (!(await this.isUsernameAvailable(username))) {
      throw new ConflictException('That username is already in use.');
    }

    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const phone = input.phone.trim();

    // Validate inputs
    if (!usernamePattern.test(username)) {
      throw new BadRequestException('Invalid username format.');
    }
    if (fullName.length === 0 || fullName.length > 200) {
      throw new BadRequestException('Full name must be between 1 and 200 characters.');
    }
    if (!phonePattern.test(phone)) {
      throw new BadRequestException('Invalid phone number format.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // TODO: Implement database insert for new user with hashed password
    // This requires updating registerAuthAccountProfile to handle password_hash
    throw new ServiceUnavailableException(
      'Sign-up functionality requires database schema migration and email service setup.',
    );
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const email = await this.database.resolveAuthAccountEmail(
      username.trim().toLowerCase(),
    );
    return email === null;
  }

  private async resolveAuthIdentifierEmail(
    identifier: string,
  ): Promise<string | null> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    if (normalizedIdentifier.includes('@')) return normalizedIdentifier;
    return this.database.resolveAuthAccountEmail(normalizedIdentifier);
  }

  async requestUsernamePasswordReset(username: string): Promise<void> {
    const email = await this.resolveAuthIdentifierEmail(username);
    if (!email) return;
    // TODO: Implement password reset email sending with token creation
  }

  async resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<void> {
    // TODO: Implement password reset with token verification
    throw new Error('Password reset not yet implemented.');
  }
}
