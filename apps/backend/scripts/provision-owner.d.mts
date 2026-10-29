import type { Pool } from 'pg';

export function provisionOwner(
  pool: Pick<Pool, 'connect'>,
  ownerUserId: string,
  businessName: string,
): Promise<{ businessId: string; ownerUserId: string }>;
