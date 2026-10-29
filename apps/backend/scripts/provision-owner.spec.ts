import { provisionOwner } from './provision-owner.mjs';
import type { Pool } from 'pg';

const ownerId = 'a25c05be-e466-45c1-b871-d8c164484fa6';
const businessId = '270da2ba-8239-4842-ac0b-9d736c524712';

function createPool({
  role = {
    rolsuper: false,
    rolbypassrls: true,
    can_insert_users: true,
    can_insert_businesses: true,
    can_insert_memberships: true,
  },
  hasBusinesses = false,
  hasMemberships = false,
  failure,
}: {
  role?: {
    rolsuper: boolean;
    rolbypassrls: boolean;
    can_insert_users: boolean;
    can_insert_businesses: boolean;
    can_insert_memberships: boolean;
  };
  hasBusinesses?: boolean;
  hasMemberships?: boolean;
  failure?: Error;
} = {}) {
  const calls: { query: string; values?: unknown[] }[] = [];
  const client = {
    query: vi.fn(async (query: string, values?: unknown[]) => {
      calls.push({ query, values });
      if (query.includes('FROM pg_roles')) {
        return { rows: [role] };
      }
      if (query.includes('has_businesses')) {
        return {
          rows: [
            { has_businesses: hasBusinesses, has_memberships: hasMemberships },
          ],
        };
      }
      if (query.includes('INSERT INTO businesses')) {
        if (failure) throw failure;
        return { rows: [{ id: businessId }] };
      }
      return { rows: [] };
    }),
    release: vi.fn(),
  };
  return {
    pool: { connect: vi.fn().mockResolvedValue(client) },
    client,
    calls,
  };
}

describe('provisionOwner', () => {
  const asPool = (pool: unknown) => pool as Pool;

  it('creates the initial owner, business, and membership atomically', async () => {
    const { pool, client, calls } = createPool();

    await expect(
      provisionOwner(asPool(pool), ownerId, 'Clare Vogue'),
    ).resolves.toEqual({ businessId, ownerUserId: ownerId });

    expect(calls.map(({ query }) => query)).toEqual([
      'BEGIN',
      expect.stringContaining('pg_advisory_xact_lock'),
      expect.stringContaining('FROM pg_roles'),
      expect.stringContaining('has_businesses'),
      expect.stringContaining('INSERT INTO users'),
      expect.stringContaining('INSERT INTO businesses'),
      expect.stringContaining('INSERT INTO business_memberships'),
      'COMMIT',
    ]);
    expect(
      calls.find(({ query }) => query.includes('INSERT INTO users'))?.values,
    ).toEqual([ownerId]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rejects invalid IDs and names before connecting to the database', async () => {
    const { pool } = createPool();

    await expect(
      provisionOwner(asPool(pool), 'not-a-uuid', 'Clare Vogue'),
    ).rejects.toThrow('OWNER_SUPABASE_USER_ID must be a valid UUID.');
    await expect(provisionOwner(asPool(pool), ownerId, '  ')).rejects.toThrow(
      'OWNER_BUSINESS_NAME must contain 1 to 200 characters.',
    );
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('refuses to provision through a role that does not bypass RLS', async () => {
    const { pool, calls, client } = createPool({
      role: {
        rolsuper: false,
        rolbypassrls: false,
        can_insert_users: true,
        can_insert_businesses: true,
        can_insert_memberships: true,
      },
    });

    await expect(
      provisionOwner(asPool(pool), ownerId, 'Clare Vogue'),
    ).rejects.toThrow('Owner provisioning requires a dedicated migration role');
    expect(calls.some(({ query }) => query.includes('INSERT INTO users'))).toBe(
      false,
    );
    expect(calls.at(-1)?.query).toBe('ROLLBACK');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('refuses to initialize a database that already contains a business', async () => {
    const { pool, calls } = createPool({ hasBusinesses: true });

    await expect(
      provisionOwner(asPool(pool), ownerId, 'Clare Vogue'),
    ).rejects.toThrow('restricted to an empty business database');
    expect(calls.some(({ query }) => query.includes('INSERT INTO users'))).toBe(
      false,
    );
    expect(calls.at(-1)?.query).toBe('ROLLBACK');
  });

  it('rolls back partial provisioning when an insert fails', async () => {
    const { pool, calls } = createPool({ failure: new Error('insert failed') });

    await expect(
      provisionOwner(asPool(pool), ownerId, 'Clare Vogue'),
    ).rejects.toThrow('insert failed');
    expect(calls.at(-1)?.query).toBe('ROLLBACK');
  });
});
