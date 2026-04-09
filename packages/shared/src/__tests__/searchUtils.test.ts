import { describe, it, expect } from 'vitest';
import { searchEventsAndTodos } from '../searchUtils';
import type { Event, Todo } from '../types';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    user_id: 'user-1',
    calendar_id: 'cal-1',
    title: 'Team Meeting',
    description: null,
    location: null,
    start_time: '2026-04-10T09:00:00',
    end_time: '2026-04-10T10:00:00',
    is_all_day: false,
    color: null,
    recurrence_rule_id: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    user_id: 'user-1',
    calendar_id: 'cal-1',
    title: 'Buy groceries',
    description: null,
    due_date: '2026-04-11',
    due_time: null,
    is_completed: false,
    completed_at: null,
    color: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('searchEventsAndTodos', () => {
  // ─── Empty / whitespace query ────────────────────────────────────────────

  describe('empty / whitespace query', () => {
    it('returns empty array for empty string', () => {
      const results = searchEventsAndTodos([makeEvent()], [makeTodo()], '');
      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace-only query', () => {
      const results = searchEventsAndTodos([makeEvent()], [makeTodo()], '   ');
      expect(results).toEqual([]);
    });

    it('returns empty array for tab-only query', () => {
      const results = searchEventsAndTodos([makeEvent()], [makeTodo()], '\t');
      expect(results).toEqual([]);
    });
  });

  // ─── No match ───────────────────────────────────────────────────────────

  describe('no match', () => {
    it('returns empty array when no events or todos match the query', () => {
      const results = searchEventsAndTodos(
        [makeEvent({ title: 'Team Meeting' })],
        [makeTodo({ title: 'Buy groceries' })],
        'zzznomatch',
      );
      expect(results).toEqual([]);
    });
  });

  // ─── Event matching ──────────────────────────────────────────────────────

  describe('event matching', () => {
    it('matches by event title (exact)', () => {
      const ev = makeEvent({ title: 'Team Meeting' });
      const results = searchEventsAndTodos([ev], [], 'Team Meeting');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('evt-1');
      expect(results[0].type).toBe('event');
    });

    it('matches by event title (case-insensitive)', () => {
      const ev = makeEvent({ title: 'Team Meeting' });
      const results = searchEventsAndTodos([ev], [], 'team meeting');
      expect(results).toHaveLength(1);
    });

    it('matches by event title (uppercase query)', () => {
      const ev = makeEvent({ title: 'Team Meeting' });
      const results = searchEventsAndTodos([ev], [], 'TEAM MEETING');
      expect(results).toHaveLength(1);
    });

    it('matches partial substring ("meet" matches "Team Meeting")', () => {
      const ev = makeEvent({ title: 'Team Meeting' });
      const results = searchEventsAndTodos([ev], [], 'meet');
      expect(results).toHaveLength(1);
    });

    it('matches by event description', () => {
      const ev = makeEvent({
        title: 'Sprint Review',
        description: 'Review the completed sprint tasks',
      });
      const results = searchEventsAndTodos([ev], [], 'completed sprint');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Sprint Review');
    });

    it('matches by event location', () => {
      const ev = makeEvent({
        title: 'Offsite Workshop',
        location: 'Conference Room B',
      });
      const results = searchEventsAndTodos([ev], [], 'conference room');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Offsite Workshop');
    });

    it('does NOT match an event with null description / location when querying those', () => {
      const ev = makeEvent({ description: null, location: null, title: 'Plain Event' });
      const results = searchEventsAndTodos([ev], [], 'description');
      expect(results).toHaveLength(0);
    });
  });

  // ─── Todo matching ───────────────────────────────────────────────────────

  describe('todo matching', () => {
    it('matches by todo title (exact)', () => {
      const todo = makeTodo({ title: 'Buy groceries' });
      const results = searchEventsAndTodos([], [todo], 'Buy groceries');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('todo-1');
      expect(results[0].type).toBe('todo');
    });

    it('matches by todo title (case-insensitive)', () => {
      const todo = makeTodo({ title: 'Buy groceries' });
      const results = searchEventsAndTodos([], [todo], 'buy GROCERIES');
      expect(results).toHaveLength(1);
    });

    it('matches by todo description', () => {
      const todo = makeTodo({
        title: 'Weekend errand',
        description: 'Pick up milk and eggs',
      });
      const results = searchEventsAndTodos([], [todo], 'milk');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Weekend errand');
    });
  });

  // ─── Soft-deleted exclusion ──────────────────────────────────────────────

  describe('soft-deleted items', () => {
    it('excludes a soft-deleted event', () => {
      const ev = makeEvent({ deleted_at: '2026-04-09T00:00:00Z' });
      const results = searchEventsAndTodos([ev], [], 'Team Meeting');
      expect(results).toHaveLength(0);
    });

    it('excludes a soft-deleted todo', () => {
      const todo = makeTodo({ deleted_at: '2026-04-09T00:00:00Z' });
      const results = searchEventsAndTodos([], [todo], 'Buy groceries');
      expect(results).toHaveLength(0);
    });

    it('includes a non-deleted event even when other events are deleted', () => {
      const deleted = makeEvent({ id: 'evt-del', deleted_at: '2026-04-09T00:00:00Z' });
      const active = makeEvent({ id: 'evt-active', deleted_at: null });
      const results = searchEventsAndTodos([deleted, active], [], 'Team Meeting');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('evt-active');
    });
  });

  // ─── Completed todo ──────────────────────────────────────────────────────

  describe('completed todos', () => {
    it('includes a completed todo that matches (completed ≠ deleted)', () => {
      const todo = makeTodo({
        is_completed: true,
        completed_at: '2026-04-09T08:00:00Z',
        deleted_at: null,
      });
      const results = searchEventsAndTodos([], [todo], 'Buy groceries');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('todo-1');
    });
  });

  // ─── Multiple matches ────────────────────────────────────────────────────

  describe('multiple matches', () => {
    it('returns all matching events when multiple events match', () => {
      const e1 = makeEvent({ id: 'e1', title: 'Morning Meeting', start_time: '2026-04-12T09:00:00', end_time: '2026-04-12T10:00:00' });
      const e2 = makeEvent({ id: 'e2', title: 'Evening Meeting', start_time: '2026-04-12T18:00:00', end_time: '2026-04-12T19:00:00' });
      const e3 = makeEvent({ id: 'e3', title: 'Lunch Break', start_time: '2026-04-12T12:00:00', end_time: '2026-04-12T13:00:00' });
      const results = searchEventsAndTodos([e1, e2, e3], [], 'meeting');
      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.id);
      expect(ids).toContain('e1');
      expect(ids).toContain('e2');
    });

    it('returns both events and todos when both match', () => {
      const ev = makeEvent({ title: 'Project Review' });
      const todo = makeTodo({ title: 'Prepare for Project Review' });
      const results = searchEventsAndTodos([ev], [todo], 'project review');
      expect(results).toHaveLength(2);
      const types = results.map((r) => r.type);
      expect(types).toContain('event');
      expect(types).toContain('todo');
    });
  });

  // ─── Sorting by date ─────────────────────────────────────────────────────

  describe('sorting by date ascending', () => {
    it('returns results sorted by date (earliest first)', () => {
      const late = makeEvent({
        id: 'late',
        title: 'Late Meeting',
        start_time: '2026-04-20T09:00:00',
        end_time: '2026-04-20T10:00:00',
      });
      const early = makeEvent({
        id: 'early',
        title: 'Early Meeting',
        start_time: '2026-04-10T09:00:00',
        end_time: '2026-04-10T10:00:00',
      });
      const results = searchEventsAndTodos([late, early], [], 'meeting');
      expect(results[0].id).toBe('early');
      expect(results[1].id).toBe('late');
    });

    it('interleaves events and todos sorted by date', () => {
      const ev = makeEvent({
        id: 'evt',
        title: 'Review',
        start_time: '2026-04-15T09:00:00',
        end_time: '2026-04-15T10:00:00',
      });
      const todo = makeTodo({
        id: 'todo',
        title: 'Review document',
        due_date: '2026-04-12',
      });
      const results = searchEventsAndTodos([ev], [todo], 'review');
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('todo');
      expect(results[1].id).toBe('evt');
    });

    it('places items with no date (null due_date) at the end', () => {
      const dated = makeTodo({
        id: 'dated',
        title: 'Buy groceries',
        due_date: '2026-04-11',
      });
      const undated = makeTodo({
        id: 'undated',
        title: 'Buy supplies',
        due_date: null,
      });
      const results = searchEventsAndTodos([], [dated, undated], 'buy');
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('dated');
      expect(results[1].id).toBe('undated');
    });
  });

  // ─── Result shape ────────────────────────────────────────────────────────

  describe('result shape', () => {
    it('correctly populates event SearchResult fields', () => {
      const ev = makeEvent({
        id: 'evt-x',
        title: 'Standup',
        start_time: '2026-04-09T09:00:00',
        end_time: '2026-04-09T09:30:00',
        is_all_day: false,
        calendar_id: 'cal-2',
      });
      const results = searchEventsAndTodos([ev], [], 'standup');
      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.id).toBe('evt-x');
      expect(r.type).toBe('event');
      expect(r.title).toBe('Standup');
      expect(r.date).toBe('2026-04-09');
      expect(r.timeText).toBe('09:00 – 09:30');
      expect(r.calendarId).toBe('cal-2');
    });

    it('sets timeText to "全天" for all-day events', () => {
      const ev = makeEvent({
        title: 'Holiday',
        is_all_day: true,
        start_time: '2026-04-09T00:00:00',
        end_time: '2026-04-09T23:59:59',
      });
      const results = searchEventsAndTodos([ev], [], 'holiday');
      expect(results[0].timeText).toBe('全天');
    });

    it('correctly populates todo SearchResult fields with due_time', () => {
      const todo = makeTodo({
        id: 'todo-x',
        title: 'Submit report',
        due_date: '2026-04-11',
        due_time: '14:30:00',
        calendar_id: 'cal-3',
      });
      const results = searchEventsAndTodos([], [todo], 'submit');
      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.id).toBe('todo-x');
      expect(r.type).toBe('todo');
      expect(r.title).toBe('Submit report');
      expect(r.date).toBe('2026-04-11');
      expect(r.timeText).toBe('14:30');
      expect(r.calendarId).toBe('cal-3');
    });

    it('sets timeText to "" for todo without due_time', () => {
      const todo = makeTodo({ due_time: null });
      const results = searchEventsAndTodos([], [todo], 'groceries');
      expect(results[0].timeText).toBe('');
    });

    it('sets date to "" for todo without due_date', () => {
      const todo = makeTodo({ due_date: null });
      const results = searchEventsAndTodos([], [todo], 'groceries');
      expect(results[0].date).toBe('');
    });
  });

  // ─── Unicode / Chinese characters ────────────────────────────────────────

  describe('unicode and Chinese character matching', () => {
    it('matches Chinese characters in event title ("会议" matches "团队会议")', () => {
      const ev = makeEvent({ title: '团队会议' });
      const results = searchEventsAndTodos([ev], [], '会议');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('团队会议');
    });

    it('matches Chinese characters in event description', () => {
      const ev = makeEvent({
        title: 'Q2 汇报',
        description: '季度财务回顾会议',
      });
      const results = searchEventsAndTodos([ev], [], '财务');
      expect(results).toHaveLength(1);
    });

    it('matches Chinese characters in todo title', () => {
      const todo = makeTodo({ title: '准备年度报告' });
      const results = searchEventsAndTodos([], [todo], '报告');
      expect(results).toHaveLength(1);
    });

    it('does not match unrelated Chinese characters', () => {
      const ev = makeEvent({ title: '团队建设活动' });
      const results = searchEventsAndTodos([ev], [], '会议');
      expect(results).toHaveLength(0);
    });
  });

  // ─── Empty inputs ────────────────────────────────────────────────────────

  describe('empty event/todo arrays', () => {
    it('returns empty array when no events and no todos given a valid query', () => {
      const results = searchEventsAndTodos([], [], 'anything');
      expect(results).toEqual([]);
    });

    it('returns empty array when only events provided and none match', () => {
      const results = searchEventsAndTodos([makeEvent()], [], 'zzz');
      expect(results).toEqual([]);
    });

    it('returns empty array when only todos provided and none match', () => {
      const results = searchEventsAndTodos([], [makeTodo()], 'zzz');
      expect(results).toEqual([]);
    });
  });
});
