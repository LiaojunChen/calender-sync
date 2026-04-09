// ============================================================
// Auth Helpers
// ============================================================
//
// Thin wrappers around Supabase Auth for email/password flow.
// All functions accept a SupabaseClient so they stay platform-agnostic.
// ============================================================

import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { TypedSupabaseClient } from './supabase';

/** Standardised auth result */
export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// --------------------------------------------------
// Sign up
// --------------------------------------------------

/**
 * Register a new user with email and password.
 * Optionally pass a display_name that will be stored in user_metadata
 * and picked up by the `handle_new_user()` database trigger.
 */
export async function signUp(
  client: TypedSupabaseClient,
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResult> {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: displayName
      ? { data: { display_name: displayName } }
      : undefined,
  });
  return {
    user: data.user ?? null,
    session: data.session ?? null,
    error,
  };
}

// --------------------------------------------------
// Sign in
// --------------------------------------------------

/**
 * Sign in with email and password.
 */
export async function signIn(
  client: TypedSupabaseClient,
  email: string,
  password: string,
): Promise<AuthResult> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  return {
    user: data.user ?? null,
    session: data.session ?? null,
    error,
  };
}

// --------------------------------------------------
// Sign out
// --------------------------------------------------

/**
 * Sign out the current user.
 */
export async function signOut(
  client: TypedSupabaseClient,
): Promise<{ error: AuthError | null }> {
  const { error } = await client.auth.signOut();
  return { error };
}

// --------------------------------------------------
// Session helpers
// --------------------------------------------------

/**
 * Retrieve the current session (if any).
 */
export async function getSession(
  client: TypedSupabaseClient,
): Promise<{ session: Session | null; error: AuthError | null }> {
  const { data, error } = await client.auth.getSession();
  return { session: data.session, error };
}

/**
 * Retrieve the currently authenticated user (makes a network call
 * to verify the JWT is still valid).
 */
export async function getUser(
  client: TypedSupabaseClient,
): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await client.auth.getUser();
  return { user: data.user ?? null, error };
}

// --------------------------------------------------
// Auth state listener
// --------------------------------------------------

/**
 * Subscribe to auth state changes (sign in, sign out, token refresh, etc.).
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  client: TypedSupabaseClient,
  callback: (event: string, session: Session | null) => void,
): { unsubscribe: () => void } {
  const { data } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return { unsubscribe: data.subscription.unsubscribe };
}

// --------------------------------------------------
// Password reset
// --------------------------------------------------

/**
 * Send a password reset email.
 */
export async function resetPassword(
  client: TypedSupabaseClient,
  email: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await client.auth.resetPasswordForEmail(email);
  return { error };
}

/**
 * Update the user's password (requires a valid session, e.g. after
 * clicking the password reset link).
 */
export async function updatePassword(
  client: TypedSupabaseClient,
  newPassword: string,
): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await client.auth.updateUser({
    password: newPassword,
  });
  return { user: data.user ?? null, error };
}
