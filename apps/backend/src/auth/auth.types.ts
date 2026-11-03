import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseAuthClient {
  auth: Pick<
    SupabaseClient['auth'],
    | 'getClaims'
    | 'getUser'
    | 'signInWithPassword'
    | 'signUp'
    | 'resetPasswordForEmail'
  >;
  admin: Pick<SupabaseClient['auth']['admin'], 'getUserById'> | null;
  issuer: string;
}
