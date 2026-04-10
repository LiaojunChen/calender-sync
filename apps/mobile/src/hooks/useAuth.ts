// ============================================================
// useAuth – auth state management hook
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  signIn as sharedSignIn,
  signUp as sharedSignUp,
  signOut as sharedSignOut,
  onAuthStateChange,
} from '@project-calendar/shared';
import { getSupabaseClientOrNull, isSupabaseConfigured } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  error: string | null;
}

export interface UseAuthReturn extends AuthState {
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    status: isSupabaseConfigured ? 'loading' : 'authenticated',
    user: null,
    session: null,
    error: null,
  });
  const isDemoMode = !isSupabaseConfigured;

  // Subscribe to auth state changes on mount
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({
        status: 'authenticated',
        user: null,
        session: null,
        error: null,
      });
      return;
    }

    const supabase = getSupabaseClientOrNull();
    if (!supabase) {
      setState({
        status: 'unauthenticated',
        user: null,
        session: null,
        error: 'Supabase 初始化失败',
      });
      return;
    }

    const { unsubscribe } = onAuthStateChange(supabase, (_event, session) => {
      if (session) {
        setState({
          status: 'authenticated',
          user: session.user,
          session,
          error: null,
        });
      } else {
        setState({
          status: 'unauthenticated',
          user: null,
          session: null,
          error: null,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSignIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        return true;
      }
      const supabase = getSupabaseClientOrNull();
      if (!supabase) {
        setState((prev) => ({ ...prev, error: 'Supabase 初始化失败' }));
        return false;
      }
      setState((prev) => ({ ...prev, error: null }));
      const result = await sharedSignIn(supabase, email, password);
      if (result.error) {
        setState((prev) => ({
          ...prev,
          error: result.error?.message ?? '登录失败',
        }));
        return false;
      }
      return true;
    },
    [],
  );

  const handleSignUp = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string,
    ): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        return true;
      }
      const supabase = getSupabaseClientOrNull();
      if (!supabase) {
        setState((prev) => ({ ...prev, error: 'Supabase 初始化失败' }));
        return false;
      }
      setState((prev) => ({ ...prev, error: null }));
      const result = await sharedSignUp(supabase, email, password, displayName);
      if (result.error) {
        setState((prev) => ({
          ...prev,
          error: result.error?.message ?? '注册失败',
        }));
        return false;
      }
      return true;
    },
    [],
  );

  const handleSignOut = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured) {
      return;
    }
    const supabase = getSupabaseClientOrNull();
    if (!supabase) {
      return;
    }
    await sharedSignOut(supabase);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    isDemoMode,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    clearError,
  };
}
