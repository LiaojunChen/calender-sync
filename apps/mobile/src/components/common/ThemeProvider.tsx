// ============================================================
// ThemeProvider – dark / light / system support
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

// ---------------------------------------------------------------------------
// Color palette (Google Calendar-inspired)
// ---------------------------------------------------------------------------

export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  tabBar: string;
  card: string;
  danger: string;
}

const LIGHT_COLORS: ThemeColors = {
  primary: '#1a73e8',
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#202124',
  textSecondary: '#5f6368',
  border: '#dadce0',
  tabBar: '#ffffff',
  card: '#ffffff',
  danger: '#ea4335',
};

const DARK_COLORS: ThemeColors = {
  primary: '#8ab4f8',
  background: '#121212',
  surface: '#1e1e1e',
  text: '#e8eaed',
  textSecondary: '#9aa0a6',
  border: '#3c4043',
  tabBar: '#1e1e1e',
  card: '#1e1e1e',
  danger: '#f28b82',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
}

interface ThemeContextValue extends Theme {
  setMode: (mode: ThemeMode) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export function ThemeProvider({
  children,
  initialMode = 'system',
}: ThemeProviderProps): React.JSX.Element {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemScheme]);

  const colors = useMemo<ThemeColors>(
    () => (isDark ? DARK_COLORS : LIGHT_COLORS),
    [isDark],
  );

  const handleSetMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      isDark,
      mode,
      setMode: handleSetMode,
    }),
    [colors, isDark, mode, handleSetMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
