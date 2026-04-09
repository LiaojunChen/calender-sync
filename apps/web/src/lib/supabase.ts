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

  // Security: warn if the Supabase URL is not using HTTPS.
  // In production all traffic must be encrypted.
  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV !== 'test' &&
    !url.startsWith('https://')
  ) {
    console.warn(
      '[Security] Supabase URL 未使用 HTTPS，生产环境中所有通信必须通过加密连接。当前 URL：',
      url,
    );
  }

  client = createSupabaseClient(url, anonKey);
  return client;
}
