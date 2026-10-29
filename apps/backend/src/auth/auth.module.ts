import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_AUTH_CLIENT } from './auth.constants.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import type { SupabaseAuthClient } from './auth.types.js';

@Module({
  providers: [
    {
      provide: SUPABASE_AUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('SUPABASE_URL');
        const publishableKey = config.get<string>(
          'SUPABASE_PUBLISHABLE_KEY',
        );
        if (!url || !publishableKey) {
          return null;
        }

        const client = createClient(url, publishableKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
          global: {
            fetch: (input, init) => {
              const timeoutSignal = AbortSignal.timeout(
                config.getOrThrow<number>('SUPABASE_AUTH_TIMEOUT_MS'),
              );
              const signal = init?.signal
                ? AbortSignal.any([init.signal, timeoutSignal])
                : timeoutSignal;
              return globalThis.fetch(input, { ...init, signal });
            },
          },
        });
        return {
          auth: client.auth,
          issuer: `${url.replace(/\/$/, '')}/auth/v1`,
        };
      },
    },
    {
      provide: AuthService,
      inject: [SUPABASE_AUTH_CLIENT],
      useFactory: (client: SupabaseAuthClient | null) => new AuthService(client),
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
