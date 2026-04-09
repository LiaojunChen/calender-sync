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
// Color palette (refined design system)
// ---------------------------------------------------------------------------

export interface ThemeColors {
  // Accent / brand
  primary: string;
  accentLight: string;
  // Backgrounds
  background: string;
  surface: string;
  bgSecondary: string;
  card: string;
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  // Borders
  border: string;
  borderLight: string;
  // Semantic
  tabBar: string;
  danger: string;
}

const LIGHT_COLORS: ThemeColors = {
  // Accent
  primary: '#4F46E5',
  accentLight: 'rgba(79,70,229,0.12)',
  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  bgSecondary: '#F1F5F9',
  card: '#FFFFFF',
  // Text
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  // Semantic
  tabBar: '#FFFFFF',
  danger: '#DC2626',
};

const DARK_COLORS: ThemeColors = {
  // Accent
  primary: '#818CF8',
  accentLight: 'rgba(129,140,248,0.15)',
  // Backgrounds
  background: '#0A0D14',
  surface: '#111827',
  bgSecondary: '#1A2236',
  card: '#151C2C',
  // Text
  text: '#F0F4FF',
  textSecondary: '#8B9DC3',
  textTertiary: '#4B5E85',
  // Borders
  border: '#1E2A3D',
  borderLight: '#162030',
  // Semantic
  tabBar: '#111827',
  danger: '#F87171',
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
