import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthControllerV2 } from './auth.controller-v2.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import { DatabaseService } from '../database/database.service.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'access-secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthControllerV2],
  providers: [
    AuthService,
    SessionService,
    {
      provide: DatabaseService,
      useClass: DatabaseService,
    },
    AuthGuard,
    {
      provide: APP_GUARD,
      useExisting: AuthGuard,
    },
  ],
  exports: [AuthService, SessionService, DatabaseService],
})
export class AuthModule {}
