import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module.js';
import type { AuthenticatedUser } from '../src/auth/authenticated-user.js';
import { DatabaseService } from '../src/database/database.service.js';
import { mediaObjects } from '../src/database/schema.js';
import { MediaService } from '../src/media/media.service.js';

const testDatabaseName = 'clare_vogue_test';
const runtimeRoleName = 'clare_vogue_runtime';
const testHosts = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  'db-test',
]);

interface FixtureIds {
  userOne: string;
  userTwo: string;
  businessOne: string;
  businessTwo: string;
  customerOne: string;
  customerTwo: string;
  orderOne: string;
  orderTwo: string;
  garmentOne: string;
  garmentTwo: string;
  availableMediaOne: string;
  pendingMediaOne: string;
  availableMediaTwo: string;
}

describe('Private media database isolation (integration)', () => {
  let moduleFixture: TestingModule | undefined;
  let adminPool: Pool | undefined;
  let database: DatabaseService;
  let mediaService: MediaService;
  let fixtures: FixtureIds | undefined;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const config = moduleFixture.get(ConfigService);
    const runtimeUrl = assertLocalTestDatabase(
      config.get<string>('DATABASE_URL'),
      'DATABASE_URL',
    );
    if (decodeURIComponent(runtimeUrl.username) !== runtimeRoleName) {
      throw new Error(
        `DATABASE_URL must use the ${runtimeRoleName} role for this integration test.`,
      );
    }

    const migrationUrl = assertLocalTestDatabase(
      config.get<string>('MIGRATION_DATABASE_URL'),
      'MIGRATION_DATABASE_URL',
    );
    if (
      decodeURIComponent(migrationUrl.username) ===
      decodeURIComponent(runtimeUrl.username)
    ) {
      throw new Error(
        'MIGRATION_DATABASE_URL must use a separate privileged test-database role.',
      );
    }

    adminPool = new Pool({
      connectionString: migrationUrl.href,
      max: 1,
      connectionTimeoutMillis: config.getOrThrow<number>(
        'DATABASE_CONNECTION_TIMEOUT_MS',
      ),
      ssl: config.getOrThrow<boolean>('DATABASE_SSL')
        ? { rejectUnauthorized: true }
        : false,
    });

    database = moduleFixture.get(DatabaseService);
    mediaService = moduleFixture.get(MediaService);
    await database.checkReadiness();
    await assertMigrationDatabaseIsTestDatabase(adminPool);

    fixtures = createFixtureIds();
    await seedFixtures(adminPool, fixtures);
  });

  it('applies PostgreSQL row-level security to media reads by tenant', async () => {
    const rowsForUserOne = await database.withAuthorizedBusinessTransaction(
      fixtures!.userOne,
      (transaction) =>
        transaction.select({ id: mediaObjects.id }).from(mediaObjects),
    );
    const rowsForUserTwo = await database.withAuthorizedBusinessTransaction(
      fixtures!.userTwo,
      (transaction) =>
        transaction.select({ id: mediaObjects.id }).from(mediaObjects),
    );

    expect(rowsForUserOne.map(({ id }) => id).sort()).toEqual(
      [fixtures!.availableMediaOne, fixtures!.pendingMediaOne].sort(),
    );
    expect(rowsForUserTwo.map(({ id }) => id)).toEqual([
      fixtures!.availableMediaTwo,
    ]);
  });

  it('lists only available media belonging to the authorized garment', async () => {
    const rowsForUserOne = await mediaService.listGarmentMedia(
      authenticatedUser(fixtures!.userOne),
      fixtures!.garmentOne,
    );
    const rowsForUserTwo = await mediaService.listGarmentMedia(
      authenticatedUser(fixtures!.userTwo),
      fixtures!.garmentTwo,
    );

    expect(rowsForUserOne).toHaveLength(1);
    expect(rowsForUserOne[0].id).toBe(fixtures!.availableMediaOne);
    expect(rowsForUserOne[0]).not.toHaveProperty('objectKey');
    expect(rowsForUserTwo).toHaveLength(1);
    expect(rowsForUserTwo[0].id).toBe(fixtures!.availableMediaTwo);
    expect(rowsForUserTwo[0]).not.toHaveProperty('objectKey');

    await expect(
      mediaService.listGarmentMedia(
        authenticatedUser(fixtures!.userOne),
        fixtures!.garmentTwo,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('denies access when the user has no active owner membership', async () => {
    await expect(
      database.withAuthorizedBusinessTransaction(randomUUID(), async () => {
        return [];
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  afterAll(async () => {
    try {
      if (adminPool && fixtures) {
        await removeFixtures(adminPool, fixtures);
      }
    } finally {
      await moduleFixture?.close();
      await adminPool?.end();
    }
  });
});

function assertLocalTestDatabase(
  connectionString: string | undefined,
  variableName: string,
): URL {
  if (!connectionString) {
    throw new Error(
      `${variableName} must be configured in apps/backend/.env; see the database integration test instructions in README.md.`,
    );
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !testHosts.has(url.hostname.toLowerCase()) ||
    url.pathname !== `/${testDatabaseName}` ||
    !url.username
  ) {
    throw new Error(
      `${variableName} must point to the local ${testDatabaseName} database.`,
    );
  }

  return url;
}

async function assertMigrationDatabaseIsTestDatabase(
  pool: Pool,
): Promise<void> {
  const { rows } = await pool.query<{ databaseName: string }>(
    'SELECT current_database() AS "databaseName"',
  );
  if (rows[0]?.databaseName !== testDatabaseName) {
    throw new Error(
      `The migration connection must be connected to ${testDatabaseName}.`,
    );
  }
}

function createFixtureIds(): FixtureIds {
  return {
    userOne: randomUUID(),
    userTwo: randomUUID(),
    businessOne: randomUUID(),
    businessTwo: randomUUID(),
    customerOne: randomUUID(),
    customerTwo: randomUUID(),
    orderOne: randomUUID(),
    orderTwo: randomUUID(),
    garmentOne: randomUUID(),
    garmentTwo: randomUUID(),
    availableMediaOne: randomUUID(),
    pendingMediaOne: randomUUID(),
    availableMediaTwo: randomUUID(),
  };
}

function authenticatedUser(id: string): AuthenticatedUser {
  return {
    id,
    sessionId: 'media-database-integration-test',
    assuranceLevel: 'aal2',
  };
}

async function seedFixtures(pool: Pool, ids: FixtureIds): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO users (id) VALUES ($1), ($2)', [
      ids.userOne,
      ids.userTwo,
    ]);
    await client.query(
      `INSERT INTO businesses (id, name)
       VALUES ($1, 'Media integration tenant one'), ($2, 'Media integration tenant two')`,
      [ids.businessOne, ids.businessTwo],
    );
    await client.query(
      `INSERT INTO business_memberships (business_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active'), ($3, $4, 'owner', 'active')`,
      [ids.businessOne, ids.userOne, ids.businessTwo, ids.userTwo],
    );
    await client.query(
      `INSERT INTO customers (id, business_id, name)
       VALUES ($1, $2, 'Integration customer one'), ($3, $4, 'Integration customer two')`,
      [ids.customerOne, ids.businessOne, ids.customerTwo, ids.businessTwo],
    );
    await client.query(
      `INSERT INTO orders (id, business_id, customer_id, reference)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
      [
        ids.orderOne,
        ids.businessOne,
        ids.customerOne,
        `IT-${ids.orderOne.slice(0, 8)}`,
        ids.orderTwo,
        ids.businessTwo,
        ids.customerTwo,
        `IT-${ids.orderTwo.slice(0, 8)}`,
      ],
    );
    await client.query(
      `INSERT INTO garments (id, business_id, order_id, customer_id, description)
       VALUES ($1, $2, $3, $4, 'Integration garment one'),
              ($5, $6, $7, $8, 'Integration garment two')`,
      [
        ids.garmentOne,
        ids.businessOne,
        ids.orderOne,
        ids.customerOne,
        ids.garmentTwo,
        ids.businessTwo,
        ids.orderTwo,
        ids.customerTwo,
      ],
    );
    await client.query(
      `INSERT INTO media_objects (
         id, business_id, garment_id, object_key, original_filename,
         content_type, file_size_bytes, status, uploaded_by,
         upload_expires_at, completed_at
       )
       VALUES
         ($1, $2, $3, $4, 'available-one.jpg', 'image/jpeg', 10, 'available', $5, now() + interval '5 minutes', now()),
         ($6, $2, $3, $7, 'pending-one.jpg', 'image/jpeg', 10, 'pending', $5, now() + interval '5 minutes', null),
         ($8, $9, $10, $11, 'available-two.jpg', 'image/jpeg', 10, 'available', $12, now() + interval '5 minutes', now())`,
      [
        ids.availableMediaOne,
        ids.businessOne,
        ids.garmentOne,
        `${ids.businessOne}/${ids.garmentOne}/${ids.availableMediaOne}`,
        ids.userOne,
        ids.pendingMediaOne,
        `${ids.businessOne}/${ids.garmentOne}/${ids.pendingMediaOne}`,
        ids.availableMediaTwo,
        ids.businessTwo,
        ids.garmentTwo,
        `${ids.businessTwo}/${ids.garmentTwo}/${ids.availableMediaTwo}`,
        ids.userTwo,
      ],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function removeFixtures(pool: Pool, ids: FixtureIds): Promise<void> {
  await pool.query('DELETE FROM media_objects WHERE id = ANY($1::uuid[])', [
    [ids.availableMediaOne, ids.pendingMediaOne, ids.availableMediaTwo],
  ]);
  await pool.query('DELETE FROM garments WHERE id = ANY($1::uuid[])', [
    [ids.garmentOne, ids.garmentTwo],
  ]);
  await pool.query('DELETE FROM orders WHERE id = ANY($1::uuid[])', [
    [ids.orderOne, ids.orderTwo],
  ]);
  await pool.query('DELETE FROM customers WHERE id = ANY($1::uuid[])', [
    [ids.customerOne, ids.customerTwo],
  ]);
  await pool.query(
    'DELETE FROM business_memberships WHERE user_id = ANY($1::uuid[])',
    [[ids.userOne, ids.userTwo]],
  );
  await pool.query('DELETE FROM businesses WHERE id = ANY($1::uuid[])', [
    [ids.businessOne, ids.businessTwo],
  ]);
  await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
    [ids.userOne, ids.userTwo],
  ]);
}
