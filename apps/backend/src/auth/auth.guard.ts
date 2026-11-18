import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SessionService } from './session.service.js';
import { IS_PUBLIC_KEY } from './auth.constants.js';

interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly session: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = request.cookies?.accessToken;

    if (!accessToken) {
      throw new UnauthorizedException('Authentication token is required.');
    }

    const payload = this.session.verifyAccessToken(accessToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }

    request.user = {
      id: payload.userId,
      username: payload.username,
      email: payload.email,
    };

    return true;
  }
}
