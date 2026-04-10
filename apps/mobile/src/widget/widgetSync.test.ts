import { describe, expect, it, vi } from 'vitest';
import {
  syncWidgetDataWithDeps,
  type WidgetSyncData,
} from './widgetSyncCore';

function createData(): WidgetSyncData {
  return {
    calendars: [{ id: 'cal-1' }] as WidgetSyncData['calendars'],
    events: [{ id: 'ev-1' }] as WidgetSyncData['events'],
    todos: [{ id: 'todo-1' }] as WidgetSyncData['todos'],
  };
}

describe('syncWidgetDataWithDeps', () => {
  it('uses demo data when Supabase is not configured', async () => {
    const demoData = createData();
    const getDemoData = vi.fn(() => demoData);
    const fetchRemoteData = vi.fn();
    const writeWidgetData = vi.fn(async () => {});
    const refreshWidget = vi.fn(async () => {});

    const result = await syncWidgetDataWithDeps({
      isSupabaseConfigured: false,
      getSupabaseClientOrNull: () => null,
      getDemoData,
      fetchRemoteData,
      writeWidgetData,
      refreshWidget,
    });

    expect(result).toBe(demoData);
    expect(getDemoData).toHaveBeenCalledTimes(1);
    expect(fetchRemoteData).not.toHaveBeenCalled();
    expect(writeWidgetData).toHaveBeenCalledWith(demoData);
    expect(refreshWidget).toHaveBeenCalledTimes(1);
  });

  it('uses remote data when Supabase is configured', async () => {
    const client = { kind: 'client' };
    const remoteData = createData();
    const getDemoData = vi.fn();
    const fetchRemoteData = vi.fn(async () => remoteData);
    const writeWidgetData = vi.fn(async () => {});
    const refreshWidget = vi.fn(async () => {});

    const result = await syncWidgetDataWithDeps({
      isSupabaseConfigured: true,
      getSupabaseClientOrNull: () => client,
      getDemoData,
      fetchRemoteData,
      writeWidgetData,
      refreshWidget,
    });

    expect(result).toBe(remoteData);
    expect(getDemoData).not.toHaveBeenCalled();
    expect(fetchRemoteData).toHaveBeenCalledWith(client);
    expect(writeWidgetData).toHaveBeenCalledWith(remoteData);
    expect(refreshWidget).toHaveBeenCalledTimes(1);
  });

  it('throws when Supabase is configured but the client is unavailable', async () => {
    await expect(
      syncWidgetDataWithDeps({
        isSupabaseConfigured: true,
        getSupabaseClientOrNull: () => null,
        getDemoData: vi.fn(),
        fetchRemoteData: vi.fn(),
        writeWidgetData: vi.fn(async () => {}),
        refreshWidget: vi.fn(async () => {}),
      }),
    ).rejects.toThrow('Supabase client unavailable');
  });
});
