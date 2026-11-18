import { Body, Controller, Post, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import { Public } from './public.decorator.js';
import {
  UsernameSignInDto,
  UsernameSignUpDto,
  UsernamePasswordResetDto,
} from './auth.dto.js';

/**
 * Updated Auth Controller with Secure Session Management
 *
 * Changes from v1:
 * - Tokens stored in httpOnly cookies (not returned in body)
 * - Automatic token refresh endpoint
 * - Forgot password with email verification
 * - Password reset endpoint
 * - Session logout endpoint
 */
@Controller('auth')
export class AuthControllerV2 {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Sign in with username/email and password
   * Sets tokens as httpOnly cookies
   */
  @Post('sign-in')
  @Public()
  async signIn(
    @Body() input: UsernameSignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.signInWithUsername(
      input.username,
      input.password,
    );

    const payload = {
      userId: tokens.userId,
      username: tokens.username,
      email: tokens.email,
    };

    const sessionTokens = this.sessionService.createTokens(payload);
    this.sessionService.setTokenCookies(response, sessionTokens);

    return {
      success: true,
      user: {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
      },
    };
  }

  /**
   * Sign up with username, email, password, full name, and phone
   * Sets tokens as httpOnly cookies after email verification
   */
  @Post('sign-up')
  @Public()
  async signUp(
    @Body() input: UsernameSignUpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.signUpWithUsername(input);

    if (result.confirmationRequired) {
      return {
        success: true,
        confirmationRequired: true,
        message: 'Please verify your email to complete signup',
      };
    }

    const payload = {
      userId: result.userId,
      username: input.username.toLowerCase().trim(),
      email: input.email.toLowerCase().trim(),
    };

    const sessionTokens = this.sessionService.createTokens(payload);
    this.sessionService.setTokenCookies(response, sessionTokens);

    return {
      success: true,
      user: {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * Browser automatically sends refreshToken cookie
   */
  @Post('refresh')
  @Public()
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      throw new Error('Refresh token not found. Please sign in again.');
    }

    const payload = this.sessionService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Refresh token expired. Please sign in again.');
    }

    const tokens = this.sessionService.createTokens(payload);
    this.sessionService.setTokenCookies(response, tokens);

    return { success: true };
  }

  /**
   * Request password reset email
   */
  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body() input: UsernamePasswordResetDto) {
    await this.authService.requestUsernamePasswordReset(input.username);

    return {
      success: true,
      message: 'If an account exists with that username or email, a reset link has been sent.',
    };
  }

  /**
   * Reset password with token (from email)
   */
  @Post('reset-password')
  @Public()
  async resetPassword(
    @Body()
    input: {
      email: string;
      token: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) {
    if (input.newPassword !== input.confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    if (input.newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    await this.authService.resetPasswordWithToken(
      input.email,
      input.token,
      input.newPassword,
    );

    return {
      success: true,
      message: 'Password has been reset. Please sign in with your new password.',
    };
  }

  /**
   * Logout - clear session cookies
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    this.sessionService.clearTokenCookies(response);

    return {
      success: true,
      message: 'You have been logged out.',
    };
  }

  /**
   * Check current session status
   * Uses httpOnly cookie automatically
   */
  @Post('session')
  async getSession(@Req() request: Request) {
    const accessToken = request.cookies.accessToken;

    if (!accessToken) {
      return { authenticated: false };
    }

    const payload = this.sessionService.verifyAccessToken(accessToken);

    if (!payload) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
      },
    };
  }
}
