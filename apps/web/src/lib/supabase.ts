import { createSupabaseClient, type TypedSupabaseClient } from '@project-calendar/shared';

let client: TypedSupabaseClient | null = null;

/**
 * Get the singleton Supabase client for the web app.
 * Returns null if env vars are not configured.
 */
export function getSupabaseClient(): TypedSupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  client = createSupabaseClient(url, anonKey);
  return client;
}
