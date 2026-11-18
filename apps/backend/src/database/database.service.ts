import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type {
  NodePgDatabase,
  NodePgTransaction,
} from 'drizzle-orm/node-postgres';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema.js';

export type BusinessTransaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool | undefined;
  private readonly database: NodePgDatabase<typeof schema> | undefined;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) {
      return;
    }

    this.pool = new Pool({
      connectionString,
      max: config.getOrThrow<number>('DATABASE_POOL_MAX'),
      connectionTimeoutMillis: config.getOrThrow<number>(
        'DATABASE_CONNECTION_TIMEOUT_MS',
      ),
      idleTimeoutMillis: 30_000,
      ssl: config.getOrThrow<boolean>('DATABASE_SSL')
        ? { rejectUnauthorized: true }
        : false,
    });
    this.database = drizzle(this.pool, { schema });
  }

  async checkReadiness(): Promise<void> {
    if (!this.pool) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    let runtimeRole: { rolsuper: boolean; rolbypassrls: boolean } | undefined;
    try {
      await this.pool.query('SELECT 1');
      const { rows } = await this.pool.query<{
        rolsuper: boolean;
        rolbypassrls: boolean;
      }>(
        `SELECT rolsuper, rolbypassrls
         FROM pg_roles
         WHERE rolname = current_user`,
      );
      runtimeRole = rows[0];
    } catch (error) {
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error(
        JSON.stringify({
          event: 'database_readiness_failed',
          errorName,
        }),
      );
      throw new ServiceUnavailableException('Database is unavailable.');
    }

    if (!runtimeRole || runtimeRole.rolsuper || runtimeRole.rolbypassrls) {
      this.logger.error(
        JSON.stringify({
          event: 'database_runtime_role_is_unsafe',
        }),
      );
      throw new ServiceUnavailableException(
        'Database runtime role must not bypass row-level security.',
      );
    }
  }

  async resolveAuthAccountEmail(username: string): Promise<string | null> {
    if (!this.pool) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    const { rows } = await this.pool.query<{ email: string | null }>(
      'SELECT public.resolve_auth_account_email($1) AS email',
      [username],
    );
    return rows[0]?.email ?? null;
  }

  async registerAuthAccountProfile(profile: {
    userId: string;
    username: string;
    email: string;
    fullName: string;
    phone: string;
  }): Promise<void> {
    if (!this.pool) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    await this.pool.query(
      `SELECT public.register_auth_account_profile($1, $2, $3, $4, $5)`,
      [
        profile.userId,
        profile.username,
        profile.email,
        profile.fullName,
        profile.phone,
      ],
    );
  }

  async getAuthAccountByEmail(
    email: string,
  ): Promise<{ userId: string; username: string; passwordHash: string } | null> {
    if (!this.database) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    const result = await this.database
      .select({
        userId: schema.authAccountProfiles.userId,
        username: schema.authAccountProfiles.username,
        passwordHash: schema.authAccountProfiles.passwordHash,
      })
      .from(schema.authAccountProfiles)
      .where(eq(schema.authAccountProfiles.email, email.toLowerCase()))
      .limit(1);

    return result[0] ?? null;
  }

  async createAuthAccountWithPassword(profile: {
    userId: string;
    username: string;
    email: string;
    fullName: string;
    phone: string;
    passwordHash: string;
  }): Promise<void> {
    if (!this.database) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    await this.database.insert(schema.authAccountProfiles).values({
      userId: profile.userId as any,
      username: profile.username,
      email: profile.email.toLowerCase(),
      fullName: profile.fullName,
      phone: profile.phone,
      passwordHash: profile.passwordHash,
    });
  }

  async updateAuthAccountPassword(
    email: string,
    passwordHash: string,
  ): Promise<void> {
    if (!this.database) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    await this.database
      .update(schema.authAccountProfiles)
      .set({ passwordHash })
      .where(eq(schema.authAccountProfiles.email, email.toLowerCase()));
  }

  async createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    if (!this.database) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    await this.database.insert(schema.passwordResetTokens).values({
      userId: userId as any,
      token,
      expiresAt,
    });
  }

  async getPasswordResetToken(
    token: string,
  ): Promise<{ userId: string; expiresAt: Date } | null> {
    if (!this.database) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    const result = await this.database
      .select({
        userId: schema.passwordResetTokens.userId,
        expiresAt: schema.passwordResetTokens.expiresAt,
      })
      .from(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.token, token))
      .limit(1);

    return result[0] ?? null;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    if (!this.database) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    await this.database
      .delete(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.token, token));
  }

  async withAuthorizedBusinessTransaction<Result>(
    userId: string,
    operation: (
      transaction: BusinessTransaction,
      businessId: string,
    ) => Promise<Result>,
  ): Promise<Result> {
    if (!this.database) {
      throw new ServiceUnavailableException('Database is not configured.');
    }

    return this.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select set_config('app.current_user_id', ${userId}, true)`,
      );

      const memberships = await transaction
        .select({
          id: schema.businessMemberships.id,
          businessId: schema.businessMemberships.businessId,
        })
        .from(schema.businessMemberships)
        .where(
          and(
            eq(schema.businessMemberships.userId, userId),
            eq(schema.businessMemberships.role, 'owner'),
            eq(schema.businessMemberships.status, 'active'),
          ),
        )
        .limit(2);

      if (memberships.length === 0) {
        throw new ForbiddenException('Business access is not authorized.');
      }
      if (memberships.length > 1) {
        throw new ConflictException(
          'More than one active owner business is configured for this account.',
        );
      }

      const businessId = memberships[0].businessId;

      await transaction.execute(
        sql`select set_config('app.current_business_id', ${businessId}, true)`,
      );

      return operation(transaction, businessId);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
