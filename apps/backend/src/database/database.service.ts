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
