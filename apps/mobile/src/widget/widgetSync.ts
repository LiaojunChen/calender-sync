import {
  getCalendars,
  getEvents,
  getTodos,
  type Calendar,
  type Event,
  type Todo,
  type TypedSupabaseClient,
} from '@project-calendar/shared';
import { createDemoCalendarData } from '../data/demoCalendarData';
import { getSupabaseClientOrNull, isSupabaseConfigured } from '../lib/supabase';
import { triggerWidgetRefresh, updateWidgetData } from './widgetDataBridge';
import { syncWidgetDataWithDeps, type WidgetSyncData } from './widgetSyncCore';

export type { WidgetSyncData } from './widgetSyncCore';

function buildEventWindow(referenceDate: Date): { startAfter: string; endBefore: string } {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  end.setHours(23, 59, 59, 999);

  return {
    startAfter: start.toISOString(),
    endBefore: end.toISOString(),
  };
}

async function fetchRemoteWidgetData(client: TypedSupabaseClient): Promise<WidgetSyncData> {
  const { startAfter, endBefore } = buildEventWindow(new Date());
  const [calendarsResult, eventsResult, todosResult] = await Promise.all([
    getCalendars(client),
    getEvents(client, {
      startAfter,
      endBefore,
    }),
    getTodos(client, {
      isCompleted: false,
    }),
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

export async function syncWidgetData(): Promise<WidgetSyncData> {
  return syncWidgetDataWithDeps({
    isSupabaseConfigured,
    getSupabaseClientOrNull,
    getDemoData: () => createDemoCalendarData(),
    fetchRemoteData: fetchRemoteWidgetData,
    writeWidgetData: async (data) => {
      await updateWidgetData(data.events, data.todos, data.calendars);
    },
    refreshWidget: triggerWidgetRefresh,
  });
}
