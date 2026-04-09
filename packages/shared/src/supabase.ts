// ============================================================
// Supabase Client Factory
// ============================================================
//
// The shared package exports a factory function so that each app
// (web / mobile) can supply its own env-specific URL and anon key.
//
// Web  :  NEXT_PUBLIC_SUPABASE_URL  / NEXT_PUBLIC_SUPABASE_ANON_KEY
// Mobile: EXPO_PUBLIC_SUPABASE_URL  / EXPO_PUBLIC_SUPABASE_ANON_KEY
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Create a typed Supabase client.
 *
 * @param url      - The Supabase project URL
 * @param anonKey  - The Supabase anonymous (public) key
 * @param options  - Optional extra client options (e.g. custom storage for auth)
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createClient>[2],
): TypedSupabaseClient {
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      ...options?.auth,
    },
    ...options,
  });
}
