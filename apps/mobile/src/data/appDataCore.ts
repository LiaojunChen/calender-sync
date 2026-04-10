import {
  buildChinaHolidayCalendar,
  ensureChinaHolidayCalendar,
  type Calendar,
  type Event,
  type Todo,
} from '@project-calendar/shared';

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

function resolveHolidayUserId(data: AppData): string {
  return data.calendars[0]?.user_id ?? data.events[0]?.user_id ?? data.todos[0]?.user_id ?? 'mobile-user';
}

function withChinaHolidayCalendar(data: AppData): AppData {
  const userId = resolveHolidayUserId(data);
  const holidayBundle = buildChinaHolidayCalendar(userId);

  return {
    calendars: ensureChinaHolidayCalendar(data.calendars, userId),
    events: [...data.events, ...holidayBundle.events],
    todos: data.todos,
  };
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

  return withChinaHolidayCalendar({
    calendars: calendarsResult.data ?? [],
    events: eventsResult.data ?? [],
    todos: todosResult.data ?? [],
  });
}

export async function loadAppDataWithDeps<TClient>(
  deps: LoadAppDataDeps<TClient>,
): Promise<AppData> {
  if (!deps.isSupabaseConfigured) {
    return withChinaHolidayCalendar(deps.getDemoData());
  }

  const client = deps.getSupabaseClientOrNull();
  if (!client) {
    throw new Error('Supabase client unavailable');
  }

  return withChinaHolidayCalendar(await deps.fetchRemoteData(client));
}
