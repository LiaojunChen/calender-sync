import { describe, expect, it, vi } from 'vitest';
import {
  fetchRemoteAppDataWithDeps,
  loadAppDataWithDeps,
  type AppData,
} from './appDataCore';

function createData(): AppData {
  return {
    calendars: [{ id: 'cal-1' }] as AppData['calendars'],
    events: [{ id: 'ev-1' }] as AppData['events'],
    todos: [{ id: 'todo-1' }] as AppData['todos'],
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

    expect(result).toBe(demoData);
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

    expect(result).toBe(remoteData);
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

    expect(result).toEqual(data);
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
