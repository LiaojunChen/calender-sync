'use client';

import React, { useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { getSupabaseClient } from '@/lib/supabase';
import {
  getSession,
  getCalendars,
  onAuthStateChange,
  getUserSettings,
  ensureChinaHolidayCalendar,
} from '@project-calendar/shared';
import type { Calendar, UserSettings } from '@project-calendar/shared';
import TopBar from '@/components/layout/TopBar';
import Sidebar from '@/components/layout/Sidebar';
import MainArea from '@/components/layout/MainArea';
import LoginForm from '@/components/auth/LoginForm';

const pageStyles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    overflow: 'hidden',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: 'var(--text-tertiary)',
    fontSize: '16px',
  },
};

function CalendarApp() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    if (!state.isAuthenticated || !state.userId) {
      return;
    }

    const nextCalendars = ensureChinaHolidayCalendar(state.calendars, state.userId);
    if (nextCalendars.length === state.calendars.length) {
      return;
    }

    dispatch({
      type: 'SET_CALENDARS',
      calendars: nextCalendars,
    });
  }, [dispatch, state.calendars, state.isAuthenticated, state.userId]);

  // Initialize auth and fetch calendars
  const initializeApp = useCallback(async () => {
    const client = getSupabaseClient();

    if (!client) {
      // No Supabase configured - remain on login page but stop loading
      dispatch({ type: 'SET_LOADING', isLoading: false });
      return;
    }

    try {
      const { session } = await getSession(client);
      if (session?.user) {
        dispatch({
          type: 'SET_AUTHENTICATED',
          isAuthenticated: true,
          userId: session.user.id,
        });

        // Fetch calendars
        const result = await getCalendars(client);
        if (result.data) {
          dispatch({
            type: 'SET_CALENDARS',
            calendars: ensureChinaHolidayCalendar(
              result.data as unknown as Calendar[],
              session.user.id,
            ),
          });
        }

        // Load user settings
        const settingsResult = await getUserSettings(client);
        if (settingsResult.data) {
          dispatch({
            type: 'SET_USER_SETTINGS',
            userSettings: settingsResult.data as unknown as UserSettings,
          });
        }
      }
    } catch (err) {
      console.error('Failed to initialize app:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, [dispatch]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Listen for auth state changes
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const { unsubscribe } = onAuthStateChange(client, async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        dispatch({
          type: 'SET_AUTHENTICATED',
          isAuthenticated: true,
          userId: session.user.id,
        });

        // Fetch calendars on sign in
        const result = await getCalendars(client);
        if (result.data) {
          dispatch({
            type: 'SET_CALENDARS',
            calendars: ensureChinaHolidayCalendar(
              result.data as unknown as Calendar[],
              session.user.id,
            ),
          });
        }

        // Load user settings
        const settingsResult = await getUserSettings(client);
        if (settingsResult.data) {
          dispatch({
            type: 'SET_USER_SETTINGS',
            userSettings: settingsResult.data as unknown as UserSettings,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        dispatch({
          type: 'SET_AUTHENTICATED',
          isAuthenticated: false,
          userId: null,
        });
        dispatch({ type: 'SET_CALENDARS', calendars: [] });
        dispatch({ type: 'SET_USER_SETTINGS', userSettings: null });
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  // Loading state
  if (state.isLoading) {
    return (
      <div style={pageStyles.loading}>
        加载中...
      </div>
    );
  }

  // Not authenticated — show login
  if (!state.isAuthenticated) {
    return <LoginForm />;
  }

  // Authenticated — show calendar layout
  return (
    <div style={pageStyles.wrapper}>
      <TopBar />
      <div style={pageStyles.body}>
        <Sidebar />
        <MainArea />
      </div>
    </div>
  );
}

export default function Home() {
  return <CalendarApp />;
}
