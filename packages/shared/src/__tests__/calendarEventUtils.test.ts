import { describe, expect, it } from 'vitest';
import { eventIntersectsDay, eventSpansMultipleDays, type Event } from '..';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    user_id: 'user-1',
    calendar_id: 'calendar-1',
    title: 'Test Event',
    description: null,
    location: null,
    start_time: '2026-04-12T09:00:00',
    end_time: '2026-04-12T10:00:00',
    is_all_day: false,
    color: null,
    recurrence_rule_id: null,
    deleted_at: null,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('eventSpansMultipleDays', () => {
  it('returns false for a same-day event', () => {
    const event = makeEvent();
    expect(eventSpansMultipleDays(event)).toBe(false);
  });

  it('returns true for an overnight event', () => {
    const event = makeEvent({
      start_time: '2026-04-12T23:00:00',
      end_time: '2026-04-13T02:00:00',
    });
    expect(eventSpansMultipleDays(event)).toBe(true);
  });

  it('treats a midnight end boundary as single-day', () => {
    const event = makeEvent({
      start_time: '2026-04-12T20:00:00',
      end_time: '2026-04-13T00:00:00',
    });
    expect(eventSpansMultipleDays(event)).toBe(false);
  });
});

describe('eventIntersectsDay', () => {
  const overnightEvent = makeEvent({
    start_time: '2026-04-12T23:00:00',
    end_time: '2026-04-13T02:00:00',
  });

  it('returns true for the start day of an overnight event', () => {
    expect(eventIntersectsDay(overnightEvent, new Date('2026-04-12T12:00:00'))).toBe(true);
  });

  it('returns true for the following day of an overnight event', () => {
    expect(eventIntersectsDay(overnightEvent, new Date('2026-04-13T12:00:00'))).toBe(true);
  });

  it('returns false for a day outside the event range', () => {
    expect(eventIntersectsDay(overnightEvent, new Date('2026-04-14T12:00:00'))).toBe(false);
  });
});
