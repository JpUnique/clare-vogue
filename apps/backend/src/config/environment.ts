import Joi from 'joi';

const isValidOriginList = (value: string): boolean => {
  const origins = value.split(',').map((origin) => origin.trim());

  if (origins.length === 0 || origins.some((origin) => origin.length === 0)) {
    return false;
  }

  return origins.every((origin) => {
    try {
      const url = new URL(origin);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        url.origin === origin &&
        url.username.length === 0 &&
        url.password.length === 0
      );
    } catch {
      return false;
    }
  });
};

const isValidDatabaseUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const isValidSupabaseUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      url.pathname === '/' &&
      url.search.length === 0 &&
      url.hash.length === 0 &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
};

const isValidObjectStorageUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
};

const objectStorageKeys = [
  'OBJECT_STORAGE_ENDPOINT',
  'OBJECT_STORAGE_BUCKET',
  'OBJECT_STORAGE_ACCESS_KEY_ID',
  'OBJECT_STORAGE_SECRET_ACCESS_KEY',
] as const;

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGINS: Joi.string()
    .custom((value: string, helpers) =>
      isValidOriginList(value) ? value : helpers.error('string.uri'),
    )
    .default('http://localhost:3001'),
  DATABASE_URL: Joi.string().custom((value: string, helpers) =>
    isValidDatabaseUrl(value) ? value : helpers.error('string.uri'),
  ),
  SUPABASE_URL: Joi.string().custom((value: string, helpers) =>
    isValidSupabaseUrl(value) ? value : helpers.error('string.uri'),
  ),
  SUPABASE_PUBLISHABLE_KEY: Joi.string().min(1),
  OBJECT_STORAGE_ENDPOINT: Joi.string().custom((value: string, helpers) =>
    isValidObjectStorageUrl(value) ? value : helpers.error('string.uri'),
  ),
  OBJECT_STORAGE_PUBLIC_ENDPOINT: Joi.string().custom(
    (value: string, helpers) =>
      isValidObjectStorageUrl(value) ? value : helpers.error('string.uri'),
  ),
  OBJECT_STORAGE_BUCKET: Joi.string().min(3).max(63),
  OBJECT_STORAGE_ACCESS_KEY_ID: Joi.string().min(1),
  OBJECT_STORAGE_SECRET_ACCESS_KEY: Joi.string().min(1),
  OBJECT_STORAGE_REGION: Joi.string().min(1).default('us-east-1'),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_POOL_MAX: Joi.number().integer().min(1).max(50).default(10),
  DATABASE_CONNECTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(100)
    .default(5000),
  SUPABASE_AUTH_TIMEOUT_MS: Joi.number().integer().min(100).default(5000),
}).unknown(true);

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnvironment = config.NODE_ENV ?? 'development';
  if (
    nodeEnvironment === 'production' &&
    (typeof config.CORS_ORIGINS !== 'string' ||
      config.CORS_ORIGINS.trim().length === 0)
  ) {
    throw new Error('CORS_ORIGINS must be configured in production.');
  }
  if (
    nodeEnvironment === 'production' &&
    (typeof config.DATABASE_URL !== 'string' ||
      config.DATABASE_URL.trim().length === 0)
  ) {
    throw new Error('DATABASE_URL must be configured in production.');
  }
  if (
    nodeEnvironment === 'production' &&
    config.DATABASE_SSL !== true &&
    config.DATABASE_SSL !== 'true'
  ) {
    throw new Error('DATABASE_SSL must be enabled in production.');
  }
  if (
    (config.SUPABASE_URL === undefined) !==
    (config.SUPABASE_PUBLISHABLE_KEY === undefined)
  ) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured together.',
    );
  }
  if (
    nodeEnvironment === 'production' &&
    (typeof config.SUPABASE_URL !== 'string' ||
      typeof config.SUPABASE_PUBLISHABLE_KEY !== 'string')
  ) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured in production.',
    );
  }
  if (
    nodeEnvironment === 'production' &&
    typeof config.SUPABASE_URL === 'string' &&
    !config.SUPABASE_URL.startsWith('https://')
  ) {
    throw new Error('SUPABASE_URL must use HTTPS in production.');
  }
  const configuredStorageKeys = objectStorageKeys.filter(
    (key) => config[key] !== undefined,
  );
  if (
    configuredStorageKeys.length > 0 &&
    configuredStorageKeys.length !== objectStorageKeys.length
  ) {
    throw new Error(
      'Object storage endpoint, bucket, access key, and secret key must be configured together.',
    );
  }
  if (
    config.OBJECT_STORAGE_PUBLIC_ENDPOINT !== undefined &&
    configuredStorageKeys.length !== objectStorageKeys.length
  ) {
    throw new Error(
      'A public object storage endpoint requires complete object storage configuration.',
    );
  }
  if (
    nodeEnvironment === 'production' &&
    configuredStorageKeys.length !== objectStorageKeys.length
  ) {
    throw new Error('Object storage must be configured in production.');
  }
  if (
    nodeEnvironment === 'production' &&
    typeof config.OBJECT_STORAGE_ENDPOINT === 'string' &&
    !config.OBJECT_STORAGE_ENDPOINT.startsWith('https://')
  ) {
    throw new Error('Object storage must use HTTPS in production.');
  }

  const { error, value } = environmentValidationSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    throw error;
  }

  return value as Record<string, unknown>;
}

export function parseCorsOrigins(value: string): string[] {
  return value.split(',').map((origin) => origin.trim());
}
