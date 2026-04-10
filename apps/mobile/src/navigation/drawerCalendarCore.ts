import type { Calendar } from '@project-calendar/shared';

interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface DrawerCalendarItem {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export interface LoadDrawerCalendarsDeps<TClient> {
  isSupabaseConfigured: boolean;
  getSupabaseClientOrNull: () => TClient | null;
  getDemoCalendars: () => Calendar[];
  getCalendars: (client: TClient) => Promise<Result<Calendar[]>>;
}

export interface ToggleDrawerCalendarVisibilityDeps<TClient> {
  updateCalendar: (
    client: TClient,
    calendarId: string,
    updates: { is_visible: boolean },
  ) => Promise<Result<Calendar>>;
}

export function buildDrawerCalendarItems(calendars: Calendar[]): DrawerCalendarItem[] {
  return calendars.map((calendar) => ({
    id: calendar.id,
    name: calendar.name,
    color: calendar.color,
    visible: calendar.is_visible,
  }));
}

export function toggleDrawerCalendarVisibilityLocally(
  calendars: Calendar[],
  calendarId: string,
): Calendar[] {
  return calendars.map((calendar) =>
    calendar.id === calendarId
      ? { ...calendar, is_visible: !calendar.is_visible }
      : calendar,
  );
}

export async function loadDrawerCalendarsWithDeps<TClient>(
  deps: LoadDrawerCalendarsDeps<TClient>,
): Promise<Calendar[]> {
  if (!deps.isSupabaseConfigured) {
    return deps.getDemoCalendars();
  }

  const client = deps.getSupabaseClientOrNull();
  if (!client) {
    throw new Error('Supabase client unavailable');
  }

  const result = await deps.getCalendars(client);
  if (result.error) {
    throw new Error(result.error);
  }

  return result.data ?? [];
}

export async function toggleDrawerCalendarVisibilityWithDeps<TClient>(
  client: TClient,
  calendars: Calendar[],
  calendarId: string,
  deps: ToggleDrawerCalendarVisibilityDeps<TClient>,
): Promise<Calendar[]> {
  const existingCalendar = calendars.find((calendar) => calendar.id === calendarId);
  if (!existingCalendar) {
    throw new Error('Calendar not found');
  }

  const result = await deps.updateCalendar(client, calendarId, {
    is_visible: !existingCalendar.is_visible,
  });
  if (result.error || !result.data) {
    throw new Error(result.error ?? '更新日历失败');
  }
  const updatedCalendar = result.data;

  return calendars.map((calendar) =>
    calendar.id === calendarId ? updatedCalendar : calendar,
  );
}
