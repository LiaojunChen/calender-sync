import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCalendars,
  getEvents,
  getTodos,
  type TypedSupabaseClient,
} from '@project-calendar/shared';
import { createDemoCalendarData } from '../data/demoCalendarData';
import {
  fetchRemoteAppDataWithDeps,
  loadAppDataWithDeps,
  type AppData,
} from '../data/appDataCore';
import { getSupabaseClientOrNull, isSupabaseConfigured } from '../lib/supabase';

const EMPTY_APP_DATA: AppData = {
  calendars: [],
  events: [],
  todos: [],
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '加载失败，请稍后重试';
}

async function fetchRemoteAppData(client: TypedSupabaseClient): Promise<AppData> {
  return fetchRemoteAppDataWithDeps(client, {
    getCalendars,
    getEvents,
    getTodos,
  });
}

export interface UseAppDataReturn extends AppData {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAppData(): UseAppDataReturn {
  const [data, setData] = useState<AppData>(() =>
    isSupabaseConfigured ? EMPTY_APP_DATA : createDemoCalendarData(),
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const nextData = await loadAppDataWithDeps({
        isSupabaseConfigured,
        getSupabaseClientOrNull,
        getDemoData: () => createDemoCalendarData(),
        fetchRemoteData: fetchRemoteAppData,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }
      setData(nextData);
    } catch (nextError) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(toErrorMessage(nextError));
      throw nextError;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {
        // Error state is stored in the hook for the screen to render.
      });

      return () => {
        requestIdRef.current += 1;
      };
    }, [refresh]),
  );

  return {
    ...data,
    loading,
    error,
    refresh,
  };
}
