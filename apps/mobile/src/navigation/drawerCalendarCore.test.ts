import { describe, expect, it, vi } from 'vitest';
import type { Calendar } from '@project-calendar/shared';
import { CHINA_HOLIDAY_CALENDAR_ID } from '@project-calendar/shared';
import {
  buildDrawerCalendarItems,
  loadDrawerCalendarsWithDeps,
  toggleDrawerCalendarVisibilityLocally,
  toggleDrawerCalendarVisibilityWithDeps,
} from './drawerCalendarCore';

function makeCalendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    id: overrides.id ?? 'cal-1',
    user_id: overrides.user_id ?? 'user-1',
    name: overrides.name ?? '个人',
    color: overrides.color ?? '#1a73e8',
    is_visible: overrides.is_visible ?? true,
    is_default: overrides.is_default ?? false,
    sort_order: overrides.sort_order ?? 0,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('loadDrawerCalendarsWithDeps', () => {
  it('uses demo calendars when Supabase is not configured', async () => {
    const demoCalendars = [makeCalendar()];
    const getDemoCalendars = vi.fn(() => demoCalendars);
    const getCalendars = vi.fn();

    const result = await loadDrawerCalendarsWithDeps({
      isSupabaseConfigured: false,
      getSupabaseClientOrNull: () => null,
      getDemoCalendars,
      getCalendars,
    });

    expect(result.some((calendar) => calendar.id === CHINA_HOLIDAY_CALENDAR_ID)).toBe(true);
    expect(getDemoCalendars).toHaveBeenCalledTimes(1);
    expect(getCalendars).not.toHaveBeenCalled();
  });

  it('uses remote calendars when Supabase is configured', async () => {
    const client = { kind: 'client' };
    const remoteCalendars = [makeCalendar()];
    const getCalendars = vi.fn(async () => ({
      data: remoteCalendars,
      error: null,
    }));

    const result = await loadDrawerCalendarsWithDeps({
      isSupabaseConfigured: true,
      getSupabaseClientOrNull: () => client,
      getDemoCalendars: vi.fn(),
      getCalendars,
    });

    expect(result.some((calendar) => calendar.id === CHINA_HOLIDAY_CALENDAR_ID)).toBe(true);
    expect(getCalendars).toHaveBeenCalledWith(client);
  });
});

describe('buildDrawerCalendarItems', () => {
  it('maps calendar visibility to drawer items', () => {
    const result = buildDrawerCalendarItems([
      makeCalendar({ id: 'cal-1', name: '个人', color: '#1a73e8', is_visible: true }),
      makeCalendar({ id: 'cal-2', name: '工作', color: '#34a853', is_visible: false }),
    ]);

    expect(result).toEqual([
      { id: 'cal-1', name: '个人', color: '#1a73e8', visible: true },
      { id: 'cal-2', name: '工作', color: '#34a853', visible: false },
    ]);
  });
});

describe('toggleDrawerCalendarVisibilityLocally', () => {
  it('flips only the selected calendar visibility', () => {
    const result = toggleDrawerCalendarVisibilityLocally([
      makeCalendar({ id: 'cal-1', is_visible: true }),
      makeCalendar({ id: 'cal-2', is_visible: false }),
    ], 'cal-2');

    expect(result.map((calendar) => ({
      id: calendar.id,
      is_visible: calendar.is_visible,
    }))).toEqual([
      { id: 'cal-1', is_visible: true },
      { id: 'cal-2', is_visible: true },
    ]);
  });
});

describe('toggleDrawerCalendarVisibilityWithDeps', () => {
  it('persists the new visibility and returns the updated calendar list', async () => {
    const client = { kind: 'client' };
    const calendars = [
      makeCalendar({ id: 'cal-1', is_visible: true }),
      makeCalendar({ id: 'cal-2', is_visible: false }),
    ];
    const updatedCalendar = makeCalendar({ id: 'cal-1', is_visible: false });
    const updateCalendar = vi.fn(async () => ({
      data: updatedCalendar,
      error: null,
    }));

    const result = await toggleDrawerCalendarVisibilityWithDeps(
      client,
      calendars,
      'cal-1',
      { updateCalendar },
    );

    expect(updateCalendar).toHaveBeenCalledWith(client, 'cal-1', { is_visible: false });
    expect(result).toEqual([
      updatedCalendar,
      calendars[1],
    ]);
  });

  it('toggles the built-in holiday calendar locally without calling the backend', async () => {
    const client = { kind: 'client' };
    const calendars = [
      makeCalendar({ id: CHINA_HOLIDAY_CALENDAR_ID, name: '中国节假日', is_visible: true }),
      makeCalendar({ id: 'cal-2', is_visible: false }),
    ];
    const updateCalendar = vi.fn();

    const result = await toggleDrawerCalendarVisibilityWithDeps(
      client,
      calendars,
      CHINA_HOLIDAY_CALENDAR_ID,
      { updateCalendar },
    );

    expect(updateCalendar).not.toHaveBeenCalled();
    expect(result[0].is_visible).toBe(false);
  });
});
