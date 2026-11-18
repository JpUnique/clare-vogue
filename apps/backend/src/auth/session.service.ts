import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class SessionService {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Create secure session tokens
   * Access token: 15 minutes
   * Refresh token: 7 days
   */
  createTokens(payload: TokenPayload): SessionTokens {
    const accessToken = this.jwt.sign(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_ACCESS_SECRET || 'access-secret',
    });

    const refreshToken = this.jwt.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    });

    return { accessToken, refreshToken };
  }

  /**
   * Set tokens as httpOnly cookies
   * - Secure: HTTPS only in production
   * - HttpOnly: Not accessible by JavaScript (prevents XSS)
   * - SameSite: Strict (prevents CSRF)
   */
  setTokenCookies(response: Response, tokens: SessionTokens) {
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth/refresh',
    });
  }

  /**
   * Clear authentication cookies (logout)
   */
  clearTokenCookies(response: Response) {
    response.clearCookie('accessToken', { path: '/' });
    response.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
  }

  /**
   * Verify and decode token
   */
  verifyToken(token: string, secret: string): TokenPayload | null {
    try {
      return this.jwt.verify(token, { secret }) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    return this.verifyToken(token, process.env.JWT_ACCESS_SECRET || 'access-secret');
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    return this.verifyToken(token, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
  }
}
