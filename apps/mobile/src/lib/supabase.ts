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

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client: TypedSupabaseClient | null = null;

export function getSupabaseClient(): TypedSupabaseClient {
  if (!_client) {
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

export const supabase = getSupabaseClient();
