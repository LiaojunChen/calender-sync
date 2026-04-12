import type { ThemeMode } from '../components/common/ThemeProvider';

export type AppViewType = 'day' | 'week' | 'month' | 'agenda';
export type WeekStartDay = 'monday' | 'sunday';

export interface AppSettings {
  default_view: AppViewType;
  week_start_day: WeekStartDay;
  default_reminder_offsets: number[];
  default_event_duration: number;
  theme: ThemeMode;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  default_view: 'week',
  week_start_day: 'monday',
  default_reminder_offsets: [10, 1440],
  default_event_duration: 60,
  theme: 'system',
};

const VALID_VIEWS: AppViewType[] = ['day', 'week', 'month', 'agenda'];
const VALID_WEEK_START_DAYS: WeekStartDay[] = ['monday', 'sunday'];
const VALID_THEMES: ThemeMode[] = ['light', 'dark', 'system'];

export function normalizeAppSettings(input?: Partial<AppSettings> | null): AppSettings {
  const next = input ?? {};

  const defaultView = VALID_VIEWS.includes(next.default_view as AppViewType)
    ? (next.default_view as AppViewType)
    : DEFAULT_APP_SETTINGS.default_view;

  const weekStartDay = VALID_WEEK_START_DAYS.includes(next.week_start_day as WeekStartDay)
    ? (next.week_start_day as WeekStartDay)
    : DEFAULT_APP_SETTINGS.week_start_day;

  const theme = VALID_THEMES.includes(next.theme as ThemeMode)
    ? (next.theme as ThemeMode)
    : DEFAULT_APP_SETTINGS.theme;

  const defaultReminderOffsets = Array.isArray(next.default_reminder_offsets)
    ? [...new Set(next.default_reminder_offsets.filter((value): value is number => Number.isFinite(value) && value > 0))]
        .sort((a, b) => a - b)
    : DEFAULT_APP_SETTINGS.default_reminder_offsets;

  const defaultEventDuration =
    typeof next.default_event_duration === 'number' && next.default_event_duration > 0
      ? next.default_event_duration
      : DEFAULT_APP_SETTINGS.default_event_duration;

  return {
    default_view: defaultView,
    week_start_day: weekStartDay,
    default_reminder_offsets:
      defaultReminderOffsets.length > 0
        ? defaultReminderOffsets
        : DEFAULT_APP_SETTINGS.default_reminder_offsets,
    default_event_duration: defaultEventDuration,
    theme,
  };
}

export function weekStartDayToIndex(weekStartDay: WeekStartDay): 0 | 1 {
  return weekStartDay === 'sunday' ? 0 : 1;
}
