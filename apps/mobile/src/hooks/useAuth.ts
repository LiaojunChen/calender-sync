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
import { supabase } from '../lib/supabase';

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
    status: 'loading',
    user: null,
    session: null,
    error: null,
  });

  // Subscribe to auth state changes on mount
  useEffect(() => {
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
    await sharedSignOut(supabase);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    clearError,
  };
}
