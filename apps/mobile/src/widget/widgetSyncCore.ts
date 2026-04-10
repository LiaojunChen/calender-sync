import type { Calendar, Event, Todo } from '@project-calendar/shared';

export interface WidgetSyncData {
  calendars: Calendar[];
  events: Event[];
  todos: Todo[];
}

export interface WidgetSyncDeps<TClient> {
  isSupabaseConfigured: boolean;
  getSupabaseClientOrNull: () => TClient | null;
  getDemoData: () => WidgetSyncData;
  fetchRemoteData: (client: TClient) => Promise<WidgetSyncData>;
  writeWidgetData: (data: WidgetSyncData) => Promise<void>;
  refreshWidget: () => Promise<void>;
}

export async function syncWidgetDataWithDeps<TClient>(
  deps: WidgetSyncDeps<TClient>,
): Promise<WidgetSyncData> {
  const data = !deps.isSupabaseConfigured
    ? deps.getDemoData()
    : await (async () => {
        const client = deps.getSupabaseClientOrNull();
        if (!client) {
          throw new Error('Supabase client unavailable');
        }
        return deps.fetchRemoteData(client);
      })();

  await deps.writeWidgetData(data);
  await deps.refreshWidget();
  return data;
}
