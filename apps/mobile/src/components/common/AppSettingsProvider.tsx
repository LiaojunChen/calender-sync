import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { getUserSettings, updateUserSettings } from '@project-calendar/shared';
import { getSupabaseClientOrNull, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  type AppSettings,
} from '../../lib/appSettingsCore';
import { useTheme } from './ThemeProvider';

const STORAGE_KEY = 'project_calendar_mobile_app_settings';

interface SaveSettingsResult {
  ok: boolean;
  error?: string;
}

interface AppSettingsContextValue {
  settings: AppSettings;
  isLoaded: boolean;
  saveSettings: (nextSettings: AppSettings) => Promise<SaveSettingsResult>;
}

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

async function readStoredSettings(): Promise<AppSettings | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeAppSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return null;
  }
}

async function writeStoredSettings(settings: AppSettings): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
}

function toAppSettings(nextSettings: {
  default_view: string;
  week_start_day: string;
  default_reminder_offsets: unknown;
  default_event_duration: number;
  theme: string;
}): AppSettings {
  return normalizeAppSettings({
    default_view: nextSettings.default_view as AppSettings['default_view'],
    week_start_day: nextSettings.week_start_day as AppSettings['week_start_day'],
    default_reminder_offsets: Array.isArray(nextSettings.default_reminder_offsets)
      ? nextSettings.default_reminder_offsets.filter((value): value is number => typeof value === 'number')
      : undefined,
    default_event_duration: nextSettings.default_event_duration,
    theme: nextSettings.theme as AppSettings['theme'],
  });
}

export function AppSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { status, isDemoMode } = useAuth();
  const { setMode } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  const applySettings = useCallback(
    async (nextSettings: AppSettings): Promise<void> => {
      const normalized = normalizeAppSettings(nextSettings);
      setSettings(normalized);
      setMode(normalized.theme);
      await writeStoredSettings(normalized);
    },
    [setMode],
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      const storedSettings = await readStoredSettings();
      if (!active) {
        return;
      }

      const nextSettings = storedSettings ?? DEFAULT_APP_SETTINGS;
      setSettings(nextSettings);
      setMode(nextSettings.theme);
      setIsLoaded(true);
    })();

    return () => {
      active = false;
    };
  }, [setMode]);

  useEffect(() => {
    if (!isLoaded || status !== 'authenticated' || isDemoMode || !isSupabaseConfigured) {
      return;
    }

    const client = getSupabaseClientOrNull();
    if (!client) {
      return;
    }

    let active = true;

    void (async () => {
      const result = await getUserSettings(client);
      if (!active || !result.data) {
        return;
      }
      await applySettings(toAppSettings(result.data));
    })();

    return () => {
      active = false;
    };
  }, [applySettings, isDemoMode, isLoaded, status]);

  const saveSettings = useCallback(
    async (nextSettings: AppSettings): Promise<SaveSettingsResult> => {
      const normalized = normalizeAppSettings(nextSettings);
      await applySettings(normalized);

      if (status !== 'authenticated' || isDemoMode || !isSupabaseConfigured) {
        return { ok: true };
      }

      const client = getSupabaseClientOrNull();
      if (!client) {
        return { ok: false, error: 'Supabase client unavailable' };
      }

      const result = await updateUserSettings(client, normalized);
      if (result.error) {
        return { ok: false, error: result.error };
      }

      if (result.data) {
        await applySettings(toAppSettings(result.data));
      }

      return { ok: true };
    },
    [applySettings, isDemoMode, status],
  );

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      isLoaded,
      saveSettings,
    }),
    [isLoaded, saveSettings, settings],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used inside <AppSettingsProvider>');
  }
  return context;
}
