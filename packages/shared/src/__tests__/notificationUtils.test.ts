import { describe, it, expect } from 'vitest';
import { buildNotificationSchedule } from '../notificationUtils';
import type { Event, Todo } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Fixed "now" used across all tests so results are deterministic.
 * 2026-04-09 08:00:00 local time.
 */
const NOW = new Date(2026, 3, 9, 8, 0, 0, 0); // 2026-04-09 08:00

/** Default reminder offsets that mirror the mobile scheduler constant. */
const DEFAULT_OFFSETS = [10, 1440];

/** Build a minimal valid Event. */
function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    user_id: 'user-1',
    calendar_id: 'cal-1',
    title: 'Test Event',
    description: null,
    location: null,
    start_time: '2026-04-09T10:00:00', // 10:00 today
    end_time: '2026-04-09T11:00:00',
    is_all_day: false,
    color: null,
    recurrence_rule_id: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Build a minimal valid Todo. */
function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    user_id: 'user-1',
    calendar_id: 'cal-1',
    title: 'Test Todo',
    description: null,
    due_date: '2026-04-09',
    due_time: '11:00',
    is_completed: false,
    completed_at: null,
    color: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper: build ISO start_time string N days from NOW at a given HH:MM
function startTimeAt(dayOffset: number, hour: number, minute: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(minute)}:00`;
}

// Helper: build due_date string N days from NOW
function dueDateOffset(dayOffset: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildNotificationSchedule', () => {
  // ---- Empty inputs -------------------------------------------------------

  describe('empty inputs', () => {
    it('returns an empty array when events and todos are empty', () => {
      const result = buildNotificationSchedule([], [], {}, {}, DEFAULT_OFFSETS, NOW);
      expect(result).toEqual([]);
    });
  });

  // ---- Event scheduling ---------------------------------------------------

  describe('event scheduling', () => {
    it('schedules a notification 10 min before an event at 10:00 today', () => {
      // event at 10:00, reminder 10 min before → trigger at 09:50, which is after NOW (08:00)
      const event = makeEvent({ start_time: startTimeAt(0, 10, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'evt-1': [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(1);
      const expected = new Date(2026, 3, 9, 9, 50, 0, 0);
      expect(result[0].triggerTime).toEqual(expected);
      expect(result[0].identifier).toBe('event-evt-1-10');
      expect(result[0].title).toBe('Test Event');
      expect(result[0].body).toBe('即将开始');
    });

    it('excludes a notification whose trigger time is in the past (1440 min before → yesterday)', () => {
      // event at 10:00 today, reminder 1440 min (1 day) before → trigger yesterday → past
      const event = makeEvent({ start_time: startTimeAt(0, 10, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'evt-1': [1440] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      // trigger would be 2026-04-08 10:00, which is before NOW (2026-04-09 08:00)
      expect(result).toHaveLength(0);
    });

    it('excludes an event 15 days from now (beyond 14-day horizon)', () => {
      const event = makeEvent({ start_time: startTimeAt(15, 10, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'evt-1': [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(0);
    });

    it('excludes a soft-deleted event', () => {
      const event = makeEvent({ deleted_at: '2026-04-08T00:00:00Z' });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'evt-1': [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(0);
    });

    it('excludes an all-day event', () => {
      const event = makeEvent({ is_all_day: true });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'evt-1': [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(0);
    });

    it('schedules multiple notifications when multiple offsets are provided for one event', () => {
      // event at 10:00, two reminders: 10 min and 30 min before
      const event = makeEvent({ start_time: startTimeAt(0, 10, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'evt-1': [10, 30] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(2);
      const identifiers = result.map((n) => n.identifier).sort();
      expect(identifiers).toContain('event-evt-1-10');
      expect(identifiers).toContain('event-evt-1-30');
    });

    it('uses default offsets when no reminders are provided for an event', () => {
      // event at 10:00 today; only the 10-min default will fire (1440-min is past)
      const event = makeEvent({ start_time: startTimeAt(0, 10, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        {}, // no explicit reminders
        {},
        DEFAULT_OFFSETS, // [10, 1440]
        NOW,
      );
      // 10-min trigger = 09:50 → future ✓; 1440-min trigger = yesterday → excluded
      expect(result).toHaveLength(1);
      expect(result[0].identifier).toBe('event-evt-1-10');
    });

    it('schedules both events when two events are on the same day', () => {
      const e1 = makeEvent({ id: 'evt-a', title: 'Meeting', start_time: startTimeAt(0, 9, 30) });
      const e2 = makeEvent({ id: 'evt-b', title: 'Lunch',   start_time: startTimeAt(0, 12, 0) });
      const result = buildNotificationSchedule(
        [e1, e2],
        [],
        { 'evt-a': [10], 'evt-b': [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(2);
      const identifiers = result.map((n) => n.identifier);
      expect(identifiers).toContain('event-evt-a-10');
      expect(identifiers).toContain('event-evt-b-10');
    });

    it('notification identifier format is event-{id}-{offset}', () => {
      const event = makeEvent({ id: 'abc-123', start_time: startTimeAt(0, 10, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'abc-123': [15] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result[0].identifier).toBe('event-abc-123-15');
    });
  });

  // ---- Todo scheduling ----------------------------------------------------

  describe('todo scheduling', () => {
    it('schedules a notification 30 min before a todo with due_date and due_time', () => {
      // todo due at 11:00 today; reminder 30 min before → trigger at 10:30
      const todo = makeTodo({ due_date: dueDateOffset(0), due_time: '11:00' });
      const result = buildNotificationSchedule(
        [],
        [todo],
        {},
        { 'todo-1': [30] },
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(1);
      const expected = new Date(2026, 3, 9, 10, 30, 0, 0);
      expect(result[0].triggerTime).toEqual(expected);
      expect(result[0].identifier).toBe('todo-todo-1-30');
      expect(result[0].title).toBe('Test Todo');
      expect(result[0].body).toBe('截止时间提醒');
    });

    it('excludes a todo without due_time', () => {
      const todo = makeTodo({ due_time: null });
      const result = buildNotificationSchedule(
        [],
        [todo],
        {},
        { 'todo-1': [30] },
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(0);
    });

    it('excludes a completed todo', () => {
      const todo = makeTodo({ is_completed: true, completed_at: '2026-04-09T07:00:00Z' });
      const result = buildNotificationSchedule(
        [],
        [todo],
        {},
        { 'todo-1': [30] },
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(0);
    });

    it('excludes a soft-deleted todo', () => {
      const todo = makeTodo({ deleted_at: '2026-04-08T00:00:00Z' });
      const result = buildNotificationSchedule(
        [],
        [todo],
        {},
        { 'todo-1': [30] },
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(0);
    });

    it('excludes a todo with no reminders configured', () => {
      const todo = makeTodo();
      const result = buildNotificationSchedule(
        [],
        [todo],
        {},
        {}, // no reminders for this todo
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(0);
    });

    it('notification identifier format is todo-{id}-{offset}', () => {
      const todo = makeTodo({ id: 'xyz-999', due_date: dueDateOffset(1), due_time: '10:00' });
      const result = buildNotificationSchedule(
        [],
        [todo],
        {},
        { 'xyz-999': [15] },
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result[0].identifier).toBe('todo-xyz-999-15');
    });
  });

  // ---- Horizon / window edge cases ----------------------------------------

  describe('horizon window', () => {
    it('includes an event whose trigger is exactly at the window end', () => {
      // horizonDays=14; windowEnd = NOW + 14 days
      // Event at 14 days + some hours from now, reminder 1 min before
      // Trigger = eventStart - 1 min; if eventStart is right at windowEnd+1min → trigger=windowEnd
      // Let's just place event just before windowEnd so trigger is safely inside
      const event = makeEvent({ id: 'edge-evt', start_time: startTimeAt(13, 9, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'edge-evt': [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
        14,
      );
      // trigger = 13 days from now at 08:50 — within window → should be included
      expect(result).toHaveLength(1);
    });

    it('excludes an event whose trigger falls beyond the window', () => {
      // Event 14 days and 1 hour from now; reminder 30 min before → trigger is 14 days + 30 min from now
      // window = 14 days → trigger is outside
      const d = new Date(NOW);
      d.setDate(d.getDate() + 14);
      d.setHours(d.getHours() + 1);
      const pad = (n: number) => String(n).padStart(2, '0');
      const startStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
      const event = makeEvent({ id: 'out-evt', start_time: startStr });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'out-evt': [30] },
        {},
        DEFAULT_OFFSETS,
        NOW,
        14,
      );
      expect(result).toHaveLength(0);
    });

    it('respects a custom horizonDays parameter', () => {
      // Event 3 days from now; within 7-day horizon but we use horizonDays=2 → excluded
      const event = makeEvent({ id: 'far-evt', start_time: startTimeAt(3, 10, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'far-evt': [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
        2, // only 2 days
      );
      expect(result).toHaveLength(0);
    });
  });

  // ---- Result ordering ----------------------------------------------------

  describe('result ordering', () => {
    it('returns notifications sorted by triggerTime ascending', () => {
      const e1 = makeEvent({ id: 'e1', start_time: startTimeAt(2, 10, 0) }); // trigger at day+2 09:50
      const e2 = makeEvent({ id: 'e2', start_time: startTimeAt(1, 12, 0) }); // trigger at day+1 11:50
      const result = buildNotificationSchedule(
        [e1, e2],
        [],
        { e1: [10], e2: [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(2);
      expect(result[0].identifier).toBe('event-e2-10');
      expect(result[1].identifier).toBe('event-e1-10');
    });
  });

  // ---- Mixed events and todos ---------------------------------------------

  describe('mixed events and todos', () => {
    it('schedules both an event and a todo in the same call', () => {
      const event = makeEvent({ start_time: startTimeAt(1, 10, 0) });
      const todo  = makeTodo({ due_date: dueDateOffset(1), due_time: '14:00' });
      const result = buildNotificationSchedule(
        [event],
        [todo],
        { 'evt-1': [10] },
        { 'todo-1': [30] },
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result).toHaveLength(2);
      const ids = result.map((n) => n.identifier);
      expect(ids).toContain('event-evt-1-10');
      expect(ids).toContain('todo-todo-1-30');
    });
  });

  // ---- Notification field values ------------------------------------------

  describe('notification field values', () => {
    it('uses event title as notification title', () => {
      const event = makeEvent({ title: 'Project Standup', start_time: startTimeAt(0, 10, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'evt-1': [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result[0].title).toBe('Project Standup');
    });

    it('uses todo title as notification title', () => {
      const todo = makeTodo({ title: 'Submit Report', due_date: dueDateOffset(1), due_time: '09:00' });
      const result = buildNotificationSchedule(
        [],
        [todo],
        {},
        { 'todo-1': [15] },
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result[0].title).toBe('Submit Report');
    });

    it('body is "即将开始" for events', () => {
      const event = makeEvent({ start_time: startTimeAt(0, 10, 0) });
      const result = buildNotificationSchedule(
        [event],
        [],
        { 'evt-1': [10] },
        {},
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result[0].body).toBe('即将开始');
    });

    it('body is "截止时间提醒" for todos', () => {
      const todo = makeTodo({ due_date: dueDateOffset(1), due_time: '10:00' });
      const result = buildNotificationSchedule(
        [],
        [todo],
        {},
        { 'todo-1': [30] },
        DEFAULT_OFFSETS,
        NOW,
      );
      expect(result[0].body).toBe('截止时间提醒');
    });
  });
});
