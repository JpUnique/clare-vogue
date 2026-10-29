import {
  environmentValidationSchema,
  validateEnvironment,
} from './environment.js';

describe('environmentValidationSchema', () => {
  it('requires explicit CORS origins in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        PORT: 3000,
      }),
    ).toThrow('CORS_ORIGINS must be configured in production.');

    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        PORT: 3000,
        CORS_ORIGINS: ' ',
      }),
    ).toThrow('CORS_ORIGINS must be configured in production.');
  });

  it('requires a database URL and TLS in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://clare-vogue.example',
      }),
    ).toThrow('DATABASE_URL must be configured in production.');

    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://clare-vogue.example',
        DATABASE_URL: 'postgresql://db.example/clare_vogue',
      }),
    ).toThrow('DATABASE_SSL must be enabled in production.');
  });

  it('requires Supabase authentication configuration in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://clare-vogue.example',
        DATABASE_URL: 'postgresql://db.example/clare_vogue',
        DATABASE_SSL: 'true',
      }),
    ).toThrow(
      'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured in production.',
    );

    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://clare-vogue.example',
        DATABASE_URL: 'postgresql://db.example/clare_vogue',
        DATABASE_SSL: 'true',
        SUPABASE_URL: 'http://project.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'public-key',
      }),
    ).toThrow('SUPABASE_URL must use HTTPS in production.');
  });

  it('accepts a valid production origin list', () => {
    const value = validateEnvironment({
      NODE_ENV: 'production',
      PORT: '3000',
      CORS_ORIGINS: 'https://clare-vogue.example,https://admin.example',
      DATABASE_URL: 'postgresql://db.example/clare_vogue',
      DATABASE_SSL: 'true',
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    });

    expect(value.PORT).toBe(3000);
  });

  it('rejects invalid origins', () => {
    const originWithCredentials = new URL('https://clare-vogue.example');
    originWithCredentials.username = 'owner';

    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        CORS_ORIGINS: originWithCredentials.href,
      }),
    ).toThrow();

    for (const origin of [
      'https://clare-vogue.example/path',
      'https://user:password@clare-vogue.example',
      'not-a-url',
    ]) {
      expect(
        () =>
          validateEnvironment({
            NODE_ENV: 'production',
            CORS_ORIGINS: origin,
          }),
        origin,
      ).toThrow();
    }
  });

  it('uses a localhost origin outside production', () => {
    const { error, value } = environmentValidationSchema.validate({
      NODE_ENV: 'test',
    });

    expect(error).toBeUndefined();
    expect(value.CORS_ORIGINS).toBe('http://localhost:3001');
    expect(value.PORT).toBe(3000);
  });

  it('requires Supabase URL and publishable key as a pair', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        SUPABASE_URL: 'https://project.supabase.co',
      }),
    ).toThrow(
      'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured together.',
    );
  });
});
