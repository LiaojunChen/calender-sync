import { describe, expect, it, vi } from 'vitest';
import { CHINA_HOLIDAY_CALENDAR_ID } from '@project-calendar/shared';
import {
  fetchRemoteAppDataWithDeps,
  loadAppDataWithDeps,
  type AppData,
} from './appDataCore';

function createData(): AppData {
  return {
    calendars: [{
      id: 'cal-1',
      user_id: 'user-1',
      name: '个人',
      color: '#1a73e8',
      is_visible: true,
      is_default: true,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }] as AppData['calendars'],
    events: [{
      id: 'ev-1',
      user_id: 'user-1',
      calendar_id: 'cal-1',
      title: '测试事件',
      description: null,
      location: null,
      start_time: '2026-04-10T09:00:00.000Z',
      end_time: '2026-04-10T10:00:00.000Z',
      is_all_day: false,
      color: null,
      recurrence_rule_id: null,
      deleted_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }] as AppData['events'],
    todos: [{
      id: 'todo-1',
      user_id: 'user-1',
      calendar_id: 'cal-1',
      title: '测试待办',
      description: null,
      due_date: '2026-04-10',
      due_time: null,
      is_completed: false,
      completed_at: null,
      color: null,
      deleted_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }] as AppData['todos'],
  };
}

describe('loadAppDataWithDeps', () => {
  it('uses demo data when Supabase is not configured', async () => {
    const demoData = createData();
    const getDemoData = vi.fn(() => demoData);
    const fetchRemoteData = vi.fn();

    const result = await loadAppDataWithDeps({
      isSupabaseConfigured: false,
      getSupabaseClientOrNull: () => null,
      getDemoData,
      fetchRemoteData,
    });

    expect(result.calendars.some((calendar) => calendar.id === CHINA_HOLIDAY_CALENDAR_ID)).toBe(true);
    expect(result.events.some((event) => event.calendar_id === CHINA_HOLIDAY_CALENDAR_ID)).toBe(true);
    expect(result.todos).toEqual(demoData.todos);
    expect(getDemoData).toHaveBeenCalledTimes(1);
    expect(fetchRemoteData).not.toHaveBeenCalled();
  });

  it('uses remote data when Supabase is configured', async () => {
    const client = { kind: 'client' };
    const remoteData = createData();
    const fetchRemoteData = vi.fn(async () => remoteData);

    const result = await loadAppDataWithDeps({
      isSupabaseConfigured: true,
      getSupabaseClientOrNull: () => client,
      getDemoData: vi.fn(),
      fetchRemoteData,
    });

    expect(result.calendars.some((calendar) => calendar.id === CHINA_HOLIDAY_CALENDAR_ID)).toBe(true);
    expect(result.events.some((event) => event.calendar_id === CHINA_HOLIDAY_CALENDAR_ID)).toBe(true);
    expect(fetchRemoteData).toHaveBeenCalledWith(client);
  });

  it('throws when Supabase is configured but the client is unavailable', async () => {
    await expect(
      loadAppDataWithDeps({
        isSupabaseConfigured: true,
        getSupabaseClientOrNull: () => null,
        getDemoData: vi.fn(),
        fetchRemoteData: vi.fn(),
      }),
    ).rejects.toThrow('Supabase client unavailable');
  });
});

describe('fetchRemoteAppDataWithDeps', () => {
  it('returns calendars, events, and todos when all queries succeed', async () => {
    const client = { kind: 'client' };
    const data = createData();

    const result = await fetchRemoteAppDataWithDeps(client, {
      getCalendars: vi.fn(async () => ({ data: data.calendars, error: null })),
      getEvents: vi.fn(async () => ({ data: data.events, error: null })),
      getTodos: vi.fn(async () => ({ data: data.todos, error: null })),
    });

    expect(result.calendars.some((calendar) => calendar.id === CHINA_HOLIDAY_CALENDAR_ID)).toBe(true);
    expect(result.events.some((event) => event.calendar_id === CHINA_HOLIDAY_CALENDAR_ID)).toBe(true);
    expect(result.todos).toEqual(data.todos);
  });

  it('throws the first query error it encounters', async () => {
    const client = { kind: 'client' };

    await expect(
      fetchRemoteAppDataWithDeps(client, {
        getCalendars: vi.fn(async () => ({ data: null, error: 'calendar failed' })),
        getEvents: vi.fn(async () => ({ data: [], error: null })),
        getTodos: vi.fn(async () => ({ data: [], error: null })),
      }),
    ).rejects.toThrow('calendar failed');
  });
});
