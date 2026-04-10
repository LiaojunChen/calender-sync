// ============================================================
// Supabase singleton for mobile
// ============================================================
//
// Uses expo-secure-store as the session storage backend so that
// the auth token survives app restarts and stays in the keychain.
// ============================================================

import * as SecureStore from 'expo-secure-store';
import { createSupabaseClient } from '@project-calendar/shared';
import type { TypedSupabaseClient } from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// SecureStore adapter (required by Supabase for custom storage)
// ---------------------------------------------------------------------------

const ExpoSecureStoreAdapter = {
  getItem: (key: string): string | null => {
    return SecureStore.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    SecureStore.setItem(key, value);
  },
  removeItem: (key: string): void => {
    void SecureStore.deleteItemAsync(key);
  },
};

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
const SUPABASE_ANON_KEY = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
export const SUPABASE_CONFIG_ERROR =
  '未配置 Supabase。请在 apps/mobile/.env 中设置 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY。';

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client: TypedSupabaseClient | null = null;

export function getSupabaseClientOrNull(): TypedSupabaseClient | null {
  if (!_client && isSupabaseConfigured) {
    _client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

export function requireSupabaseClient(): TypedSupabaseClient {
  const client = getSupabaseClientOrNull();
  if (!client) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }
  return client;
}
