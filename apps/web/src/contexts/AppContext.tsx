'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import type { Calendar } from '@project-calendar/shared';

// ============================================================
// Types
// ============================================================

export type ViewType = 'day' | 'week' | 'month' | 'agenda';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppState {
  /** Currently selected view */
  currentView: ViewType;
  /** Anchor date for the current view (start of day) */
  currentDate: Date;
  /** Whether sidebar is visible */
  sidebarOpen: boolean;
  /** All calendars for the user */
  calendars: Calendar[];
  /** Theme preference */
  theme: ThemeMode;
  /** Resolved theme (after applying system preference) */
  resolvedTheme: 'light' | 'dark';
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Loading state */
  isLoading: boolean;
  /** User ID if authenticated */
  userId: string | null;
}

type AppAction =
  | { type: 'SET_VIEW'; view: ViewType }
  | { type: 'SET_DATE'; date: Date }
  | { type: 'SET_SIDEBAR_OPEN'; open: boolean }
  | { type: 'SET_CALENDARS'; calendars: Calendar[] }
  | { type: 'ADD_CALENDAR'; calendar: Calendar }
  | { type: 'UPDATE_CALENDAR'; calendar: Calendar }
  | { type: 'REMOVE_CALENDAR'; id: string }
  | { type: 'TOGGLE_CALENDAR_VISIBILITY'; id: string }
  | { type: 'SET_THEME'; theme: ThemeMode }
  | { type: 'SET_RESOLVED_THEME'; resolvedTheme: 'light' | 'dark' }
  | { type: 'SET_AUTHENTICATED'; isAuthenticated: boolean; userId: string | null }
  | { type: 'SET_LOADING'; isLoading: boolean };

export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  /** Convenience helpers */
  setView: (view: ViewType) => void;
  setDate: (date: Date) => void;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  navigateToday: () => void;
  navigatePrev: () => void;
  navigateNext: () => void;
}

// ============================================================
// Initial state
// ============================================================

const initialState: AppState = {
  currentView: 'week',
  currentDate: new Date(),
  sidebarOpen: true,
  calendars: [],
  theme: 'system',
  resolvedTheme: 'light',
  isAuthenticated: false,
  isLoading: true,
  userId: null,
};

// ============================================================
// Reducer
// ============================================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.view };
    case 'SET_DATE':
      return { ...state, currentDate: action.date };
    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.open };
    case 'SET_CALENDARS':
      return { ...state, calendars: action.calendars };
    case 'ADD_CALENDAR':
      return { ...state, calendars: [...state.calendars, action.calendar] };
    case 'UPDATE_CALENDAR':
      return {
        ...state,
        calendars: state.calendars.map((c) =>
          c.id === action.calendar.id ? action.calendar : c
        ),
      };
    case 'REMOVE_CALENDAR':
      return {
        ...state,
        calendars: state.calendars.filter((c) => c.id !== action.id),
      };
    case 'TOGGLE_CALENDAR_VISIBILITY':
      return {
        ...state,
        calendars: state.calendars.map((c) =>
          c.id === action.id ? { ...c, is_visible: !c.is_visible } : c
        ),
      };
    case 'SET_THEME':
      return { ...state, theme: action.theme };
    case 'SET_RESOLVED_THEME':
      return { ...state, resolvedTheme: action.resolvedTheme };
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
        userId: action.userId,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}

// ============================================================
// Navigation helpers
// ============================================================

function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonthsToDate(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ============================================================
// Provider
// ============================================================

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Resolve system theme
  useEffect(() => {
    function updateResolvedTheme() {
      if (state.theme === 'system') {
        const isDark =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        dispatch({ type: 'SET_RESOLVED_THEME', resolvedTheme: isDark ? 'dark' : 'light' });
      } else {
        dispatch({ type: 'SET_RESOLVED_THEME', resolvedTheme: state.theme });
      }
    }

    updateResolvedTheme();

    if (state.theme === 'system' && typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateResolvedTheme();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [state.theme]);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', state.resolvedTheme);
    }
  }, [state.resolvedTheme]);

  const setView = useCallback(
    (view: ViewType) => dispatch({ type: 'SET_VIEW', view }),
    []
  );

  const setDate = useCallback(
    (date: Date) => dispatch({ type: 'SET_DATE', date }),
    []
  );

  const toggleSidebar = useCallback(
    () => dispatch({ type: 'SET_SIDEBAR_OPEN', open: !state.sidebarOpen }),
    [state.sidebarOpen]
  );

  const setTheme = useCallback(
    (theme: ThemeMode) => dispatch({ type: 'SET_THEME', theme }),
    []
  );

  const navigateToday = useCallback(
    () => dispatch({ type: 'SET_DATE', date: new Date() }),
    []
  );

  const navigatePrev = useCallback(() => {
    const { currentView, currentDate } = state;
    let newDate: Date;
    switch (currentView) {
      case 'day':
        newDate = addDaysToDate(currentDate, -1);
        break;
      case 'week':
        newDate = addDaysToDate(currentDate, -7);
        break;
      case 'month':
        newDate = addMonthsToDate(currentDate, -1);
        break;
      case 'agenda':
        newDate = addDaysToDate(currentDate, -7);
        break;
      default:
        newDate = currentDate;
    }
    dispatch({ type: 'SET_DATE', date: newDate });
  }, [state.currentView, state.currentDate]);

  const navigateNext = useCallback(() => {
    const { currentView, currentDate } = state;
    let newDate: Date;
    switch (currentView) {
      case 'day':
        newDate = addDaysToDate(currentDate, 1);
        break;
      case 'week':
        newDate = addDaysToDate(currentDate, 7);
        break;
      case 'month':
        newDate = addMonthsToDate(currentDate, 1);
        break;
      case 'agenda':
        newDate = addDaysToDate(currentDate, 7);
        break;
      default:
        newDate = currentDate;
    }
    dispatch({ type: 'SET_DATE', date: newDate });
  }, [state.currentView, state.currentDate]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch,
      setView,
      setDate,
      toggleSidebar,
      setTheme,
      navigateToday,
      navigatePrev,
      navigateNext,
    }),
    [state, setView, setDate, toggleSidebar, setTheme, navigateToday, navigatePrev, navigateNext]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
