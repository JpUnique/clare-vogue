import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import type { UsernameSignUpDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import type { SupabaseAuthClient } from './auth.types.js';
import type { DatabaseService } from '../database/database.service.js';

function createDatabase() {
  return {
    resolveAuthAccountEmail: vi.fn(),
    registerAuthAccountProfile: vi.fn(),
  } as unknown as DatabaseService;
}

describe('AuthService username authentication', () => {
  it('signs in by the normalized username without returning the email', async () => {
    const database = createDatabase();
    vi.mocked(database.resolveAuthAccountEmail).mockResolvedValue(
      'owner@example.com',
    );
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
      },
      error: null,
    });
    const client = {
      auth: { signInWithPassword },
      admin: null,
      issuer: 'https://project.supabase.co/auth/v1',
    } as unknown as SupabaseAuthClient;
    const auth = new AuthService(client, database);

    await expect(
      auth.signInWithUsername(' Clare.Vogue ', 'password'),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(database.resolveAuthAccountEmail).toHaveBeenCalledWith(
      'clare.vogue',
    );
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'password',
    });
  });

  it('uses the same credential error for usernames that are not registered', async () => {
    const database = createDatabase();
    vi.mocked(database.resolveAuthAccountEmail).mockResolvedValue(null);
    const client = {
      auth: { signInWithPassword: vi.fn() },
      admin: null,
      issuer: 'https://project.supabase.co/auth/v1',
    } as unknown as SupabaseAuthClient;
    const auth = new AuthService(client, database);

    await expect(
      auth.signInWithUsername('not-a-user', 'password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('creates a username account and stores its private profile', async () => {
    const database = createDatabase();
    vi.mocked(database.resolveAuthAccountEmail).mockResolvedValue(null);
    const signUp = vi.fn().mockResolvedValue({
      data: {
        user: { id: 'auth-user-id' },
        session: null,
      },
      error: null,
    });
    const getUserById = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'auth-user-id',
          email: 'owner@example.com',
          user_metadata: {
            username: 'clare.vogue',
            full_name: 'Clare Vogue',
            phone: '+2348012345678',
          },
        },
      },
      error: null,
    });
    const client = {
      auth: { signUp },
      admin: { getUserById },
      issuer: 'https://project.supabase.co/auth/v1',
    } as unknown as SupabaseAuthClient;
    const auth = new AuthService(client, database);
    const input: UsernameSignUpDto = {
      username: 'Clare.Vogue',
      email: 'Owner@Example.com',
      password: 'secure-password',
      fullName: 'Clare Vogue',
      phone: '+2348012345678',
    };

    await expect(auth.signUpWithUsername(input)).resolves.toEqual({
      accessToken: null,
      refreshToken: null,
      confirmationRequired: true,
    });

    expect(signUp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'secure-password',
      options: {
        data: {
          username: 'clare.vogue',
          full_name: 'Clare Vogue',
          phone: '+2348012345678',
        },
      },
    });
    expect(getUserById).toHaveBeenCalledWith('auth-user-id');
    expect(database.registerAuthAccountProfile).toHaveBeenCalledWith({
      userId: 'auth-user-id',
      username: 'clare.vogue',
      email: 'owner@example.com',
      fullName: 'Clare Vogue',
      phone: '+2348012345678',
    });
  });

  it('rejects taken usernames before calling Supabase sign-up', async () => {
    const database = createDatabase();
    vi.mocked(database.resolveAuthAccountEmail).mockResolvedValue(
      'owner@example.com',
    );
    const signUp = vi.fn();
    const client = {
      auth: { signUp },
      admin: { getUserById: vi.fn() },
      issuer: 'https://project.supabase.co/auth/v1',
    } as unknown as SupabaseAuthClient;
    const auth = new AuthService(client, database);

    await expect(
      auth.signUpWithUsername({
        username: 'clare.vogue',
        email: 'owner@example.com',
        password: 'secure-password',
        fullName: 'Clare Vogue',
        phone: '+2348012345678',
      }),
    ).rejects.toThrow(ConflictException);
    expect(signUp).not.toHaveBeenCalled();
  });

  it('rejects provider metadata that does not match the sign-up request', async () => {
    const database = createDatabase();
    vi.mocked(database.resolveAuthAccountEmail).mockResolvedValue(null);
    const client = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'auth-user-id' }, session: null },
          error: null,
        }),
      },
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'auth-user-id',
              email: 'owner@example.com',
              user_metadata: {
                username: 'different.username',
                full_name: 'Clare Vogue',
                phone: '+2348012345678',
              },
            },
          },
          error: null,
        }),
      },
      issuer: 'https://project.supabase.co/auth/v1',
    } as unknown as SupabaseAuthClient;
    const auth = new AuthService(client, database);

    await expect(
      auth.signUpWithUsername({
        username: 'clare.vogue',
        email: 'owner@example.com',
        password: 'secure-password',
        fullName: 'Clare Vogue',
        phone: '+2348012345678',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(database.registerAuthAccountProfile).not.toHaveBeenCalled();
  });
});
