import { describe, expect, it } from 'vitest';
import {
  buildNavigationStateForWidgetPath,
  resolveWidgetLinkTarget,
} from './widgetLinks';

describe('resolveWidgetLinkTarget', () => {
  it('resolves event detail links when Supabase is configured', () => {
    expect(resolveWidgetLinkTarget('/event/ev-123', true)).toEqual({
      kind: 'event-detail',
      eventId: 'ev-123',
    });
  });

  it('falls back to agenda view for event links in demo mode', () => {
    expect(resolveWidgetLinkTarget('/event/ev-123', false)).toEqual({
      kind: 'agenda-today',
    });
  });

  it('routes todo links to the editable todo form when Supabase is configured', () => {
    expect(resolveWidgetLinkTarget('/todo/todo-123', true)).toEqual({
      kind: 'todo-form',
      todoId: 'todo-123',
    });
  });

  it('falls back to agenda view for new-event links in demo mode', () => {
    expect(resolveWidgetLinkTarget('/new-event', false)).toEqual({
      kind: 'agenda-today',
    });
  });
});

describe('buildNavigationStateForWidgetPath', () => {
  it('builds a nested agenda navigation state', () => {
    expect(buildNavigationStateForWidgetPath('/agenda/today', false)).toEqual({
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
                        focusDate: 'today',
                        initialView: 'agenda',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it('builds an event detail state when Supabase is configured', () => {
    expect(buildNavigationStateForWidgetPath('/event/ev-123', true)).toEqual({
      routes: [
        {
          name: 'EventDetail',
          params: {
            eventId: 'ev-123',
          },
        },
      ],
    });
  });
});
