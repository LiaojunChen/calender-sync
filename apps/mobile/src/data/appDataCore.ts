import type { Calendar, Event, Todo } from '@project-calendar/shared';

export interface AppData {
  calendars: Calendar[];
  events: Event[];
  todos: Todo[];
}

interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface FetchRemoteAppDataDeps<TClient> {
  getCalendars: (client: TClient) => Promise<Result<Calendar[]>>;
  getEvents: (client: TClient) => Promise<Result<Event[]>>;
  getTodos: (client: TClient) => Promise<Result<Todo[]>>;
}

export interface LoadAppDataDeps<TClient> {
  isSupabaseConfigured: boolean;
  getSupabaseClientOrNull: () => TClient | null;
  getDemoData: () => AppData;
  fetchRemoteData: (client: TClient) => Promise<AppData>;
}

export async function fetchRemoteAppDataWithDeps<TClient>(
  client: TClient,
  deps: FetchRemoteAppDataDeps<TClient>,
): Promise<AppData> {
  const [calendarsResult, eventsResult, todosResult] = await Promise.all([
    deps.getCalendars(client),
    deps.getEvents(client),
    deps.getTodos(client),
  ]);

  if (calendarsResult.error) {
    throw new Error(calendarsResult.error);
  }
  if (eventsResult.error) {
    throw new Error(eventsResult.error);
  }
  if (todosResult.error) {
    throw new Error(todosResult.error);
  }

  return {
    calendars: calendarsResult.data ?? [],
    events: eventsResult.data ?? [],
    todos: todosResult.data ?? [],
  };
}

export async function loadAppDataWithDeps<TClient>(
  deps: LoadAppDataDeps<TClient>,
): Promise<AppData> {
  if (!deps.isSupabaseConfigured) {
    return deps.getDemoData();
  }

  const client = deps.getSupabaseClientOrNull();
  if (!client) {
    throw new Error('Supabase client unavailable');
  }

  return deps.fetchRemoteData(client);
}
