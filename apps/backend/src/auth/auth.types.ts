import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseAuthClient {
  auth: Pick<SupabaseClient['auth'], 'getClaims' | 'getUser'>;
  issuer: string;
}
