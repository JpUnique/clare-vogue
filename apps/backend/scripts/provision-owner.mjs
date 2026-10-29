import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function provisionOwner(pool, ownerUserId, businessName) {
  if (!OWNER_ID_PATTERN.test(ownerUserId)) {
    throw new Error('OWNER_SUPABASE_USER_ID must be a valid UUID.');
  }
  if (
    typeof businessName !== 'string' ||
    businessName.trim().length === 0 ||
    businessName.trim().length > 200
  ) {
    throw new Error('OWNER_BUSINESS_NAME must contain 1 to 200 characters.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext('clare_vogue_initial_owner'))`,
    );

    const { rows: roleRows } = await client.query(
      `SELECT
         r.rolsuper,
         r.rolbypassrls,
         has_table_privilege(current_user, 'public.users', 'INSERT') AS can_insert_users,
         has_table_privilege(current_user, 'public.businesses', 'INSERT') AS can_insert_businesses,
         has_table_privilege(current_user, 'public.business_memberships', 'INSERT') AS can_insert_memberships
       FROM pg_roles AS r
       WHERE r.rolname = current_user`,
    );
    if (
      !roleRows[0] ||
      (!roleRows[0].rolsuper && !roleRows[0].rolbypassrls) ||
      !roleRows[0].can_insert_users ||
      !roleRows[0].can_insert_businesses ||
      !roleRows[0].can_insert_memberships
    ) {
      throw new Error(
        'Owner provisioning requires a dedicated migration role with RLS bypass and insert privileges; never use the runtime role.',
      );
    }

    const { rows: stateRows } = await client.query(
      `SELECT
         EXISTS (SELECT 1 FROM businesses) AS has_businesses,
         EXISTS (SELECT 1 FROM business_memberships) AS has_memberships`,
    );
    if (stateRows[0]?.has_businesses || stateRows[0]?.has_memberships) {
      throw new Error(
        'Owner provisioning is restricted to an empty business database.',
      );
    }

    await client.query(
      `INSERT INTO users (id)
       VALUES ($1)
       ON CONFLICT (id) DO NOTHING`,
      [ownerUserId],
    );

    const { rows: businesses } = await client.query(
      `INSERT INTO businesses (id, name)
       VALUES ($1, $2)
       RETURNING id`,
      [randomUUID(), businessName.trim()],
    );
    const businessId = businesses[0]?.id;
    if (typeof businessId !== 'string') {
      throw new Error('Business provisioning did not return an ID.');
    }

    await client.query(
      `INSERT INTO business_memberships (business_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')`,
      [businessId, ownerUserId],
    );

    await client.query('COMMIT');
    return { businessId, ownerUserId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL;
  const ownerUserId = process.env.OWNER_SUPABASE_USER_ID;
  const businessName = process.env.OWNER_BUSINESS_NAME;

  if (!migrationDatabaseUrl) {
    throw new Error('MIGRATION_DATABASE_URL must be set.');
  }
  if (!ownerUserId || !businessName) {
    throw new Error(
      'Set OWNER_SUPABASE_USER_ID and OWNER_BUSINESS_NAME for the verified owner.',
    );
  }

  const pool = new Pool({ connectionString: migrationDatabaseUrl });
  try {
    const result = await provisionOwner(pool, ownerUserId, businessName);
    console.info(
      JSON.stringify({
        event: 'initial_owner_provisioned',
        businessId: result.businessId,
        ownerUserId: result.ownerUserId,
      }),
    );
  } finally {
    await pool.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'Owner provisioning failed.',
    );
    process.exitCode = 1;
  });
}
