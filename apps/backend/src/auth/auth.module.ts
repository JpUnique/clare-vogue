import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_AUTH_CLIENT } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import type { SupabaseAuthClient } from './auth.types.js';
import { DatabaseService } from '../database/database.service.js';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: SUPABASE_AUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('SUPABASE_URL');
        const publishableKey = config.get<string>('SUPABASE_PUBLISHABLE_KEY');
        const secretKey = config.get<string>('SUPABASE_SECRET_KEY');
        if (!url || !publishableKey) {
          return null;
        }

        const fetchWithTimeout: typeof globalThis.fetch = (input, init) => {
          const timeoutSignal = AbortSignal.timeout(
            config.getOrThrow<number>('SUPABASE_AUTH_TIMEOUT_MS'),
          );
          const signal = init?.signal
            ? AbortSignal.any([init.signal, timeoutSignal])
            : timeoutSignal;
          return globalThis.fetch(input, { ...init, signal });
        };
        const authOptions = {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
          global: { fetch: fetchWithTimeout },
        };
        const client = createClient(url, publishableKey, authOptions);
        const adminClient = secretKey
          ? createClient(url, secretKey, authOptions)
          : null;
        return {
          auth: client.auth,
          admin: adminClient?.auth.admin ?? null,
          issuer: `${url.replace(/\/$/, '')}/auth/v1`,
        };
      },
    },
    {
      provide: AuthService,
      inject: [SUPABASE_AUTH_CLIENT, DatabaseService],
      useFactory: (
        client: SupabaseAuthClient | null,
        database: DatabaseService,
      ) => new AuthService(client, database),
    },
    AuthGuard,
    {
      provide: APP_GUARD,
      useExisting: AuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
