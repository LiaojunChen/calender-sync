import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

type NavigationStateLike = {
  routes: Array<{
    name: string;
    params?: Record<string, unknown>;
    state?: NavigationStateLike;
  }>;
};

export type WidgetLinkTarget =
  | { kind: 'agenda-today' }
  | { kind: 'event-form' }
  | { kind: 'todo-form'; todoId?: string }
  | { kind: 'event-detail'; eventId: string };

function normalizePath(path: string): string {
  const [pathname] = path.split('?');
  return pathname.replace(/^\/+/, '');
}

export function resolveWidgetLinkTarget(
  path: string,
  supabaseEnabled: boolean,
): WidgetLinkTarget | null {
  const normalized = normalizePath(path);

  if (normalized === 'agenda/today' || normalized.length === 0) {
    return { kind: 'agenda-today' };
  }

  if (normalized === 'new-event') {
    return supabaseEnabled ? { kind: 'event-form' } : { kind: 'agenda-today' };
  }

  if (normalized === 'new-todo') {
    return supabaseEnabled ? { kind: 'todo-form' } : { kind: 'agenda-today' };
  }

  if (normalized.startsWith('event/')) {
    const eventId = normalized.slice('event/'.length);
    if (!eventId) return null;
    return supabaseEnabled ? { kind: 'event-detail', eventId } : { kind: 'agenda-today' };
  }

  if (normalized.startsWith('todo/')) {
    const todoId = normalized.slice('todo/'.length);
    if (!todoId) return null;
    return supabaseEnabled ? { kind: 'todo-form', todoId } : { kind: 'agenda-today' };
  }

  return null;
}

function buildAgendaTodayState(): NavigationStateLike {
  return {
    routes: [
      {
        name: 'Main',
        state: {
          routes: [
            {
              name: 'Calendar',
              state: {
                routes: [
                  {
                    name: 'CalendarTab',
                    params: {
                      initialView: 'agenda',
                      focusDate: 'today',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  };
}

export function buildNavigationStateForWidgetPath(
  path: string,
  supabaseEnabled: boolean,
): NavigationStateLike | undefined {
  const target = resolveWidgetLinkTarget(path, supabaseEnabled);
  if (!target) {
    return undefined;
  }

  switch (target.kind) {
    case 'agenda-today':
      return buildAgendaTodayState();
    case 'event-form':
      return { routes: [{ name: 'EventForm' }] };
    case 'todo-form':
      return {
        routes: [
          {
            name: 'TodoForm',
            params: target.todoId ? { todoId: target.todoId } : undefined,
          },
        ],
      };
    case 'event-detail':
      return {
        routes: [
          {
            name: 'EventDetail',
            params: { eventId: target.eventId },
          },
        ],
      };
  }
}

export function createWidgetLinking(
  supabaseEnabled: boolean,
): LinkingOptions<RootStackParamList> {
  return {
    prefixes: ['projectcalendar://'],
    getStateFromPath(path) {
      return buildNavigationStateForWidgetPath(path, supabaseEnabled) as never;
    },
  };
}
