import { describe, expect, it } from 'vitest';
import type { Event } from '@project-calendar/shared';
import { expandCalendarEvents, type EventWithRrule } from './expandedEventsCore';

function makeEvent(overrides: Partial<EventWithRrule> = {}): EventWithRrule {
  return {
    id: overrides.id ?? 'event-1',
    user_id: overrides.user_id ?? 'user-1',
    calendar_id: overrides.calendar_id ?? 'cal-1',
    title: overrides.title ?? '晨会',
    description: overrides.description ?? null,
    location: overrides.location ?? null,
    start_time: overrides.start_time ?? '2026-04-10T09:00:00.000Z',
    end_time: overrides.end_time ?? '2026-04-10T10:00:00.000Z',
    is_all_day: overrides.is_all_day ?? false,
    color: overrides.color ?? null,
    recurrence_rule_id: overrides.recurrence_rule_id ?? null,
    deleted_at: overrides.deleted_at ?? null,
    created_at: overrides.created_at ?? '2026-04-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-04-01T00:00:00.000Z',
    rrule_string: overrides.rrule_string ?? null,
  };
}

describe('expandCalendarEvents', () => {
  it('expands recurring events into concrete instances within range', () => {
    const events = [
      makeEvent({
        recurrence_rule_id: 'rule-1',
        rrule_string: 'FREQ=DAILY;COUNT=3',
      }),
    ];

    const result = expandCalendarEvents(
      events,
      new Date('2026-04-10T00:00:00.000Z'),
      new Date('2026-04-12T23:59:59.999Z'),
    );

    expect(result.map((event) => event.id)).toEqual([
      'event-1::2026-04-10',
      'event-1::2026-04-11',
      'event-1::2026-04-12',
    ]);
  });

  it('applies recurrence exceptions to generated instances', () => {
    const events = [
      makeEvent({
        recurrence_rule_id: 'rule-1',
        rrule_string: 'FREQ=DAILY;COUNT=3',
      }),
    ];

    const result = expandCalendarEvents(
      events,
      new Date('2026-04-10T00:00:00.000Z'),
      new Date('2026-04-12T23:59:59.999Z'),
      [
        {
          event_id: 'event-1',
          original_date: '2026-04-11',
          action: 'skip',
        },
        {
          event_id: 'event-1',
          original_date: '2026-04-12',
          action: 'modify',
          modified_title: '改期晨会',
        },
      ],
    );

    expect(result.map((event) => ({
      id: event.id,
      title: event.title,
    }))).toEqual([
      { id: 'event-1::2026-04-10', title: '晨会' },
      { id: 'event-1::2026-04-12', title: '改期晨会' },
    ]);
  });

  it('keeps non-recurring events that overlap the requested range', () => {
    const events = [
      makeEvent({
        id: 'event-plain',
        recurrence_rule_id: null,
        rrule_string: null,
        start_time: '2026-04-10T09:00:00.000Z',
        end_time: '2026-04-10T10:00:00.000Z',
      }),
      makeEvent({
        id: 'event-outside',
        recurrence_rule_id: null,
        rrule_string: null,
        start_time: '2026-05-10T09:00:00.000Z',
        end_time: '2026-05-10T10:00:00.000Z',
      }),
    ];

    const result = expandCalendarEvents(
      events,
      new Date('2026-04-10T00:00:00.000Z'),
      new Date('2026-04-10T23:59:59.999Z'),
    );

    expect(result.map((event) => event.id)).toEqual(['event-plain']);
  });
});
