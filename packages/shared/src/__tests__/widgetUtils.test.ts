import { describe, it, expect } from 'vitest';
import { buildWidgetDayGroups } from '../widgetUtils';
import type { Calendar, Event, Todo } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures / factory helpers
// ---------------------------------------------------------------------------

/** Fixed "today" used across all tests so results are deterministic. */
const TODAY = new Date(2026, 3, 9, 0, 0, 0, 0); // 2026-04-09 (Thursday)

/** Build a minimal valid Calendar. */
function makeCalendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    id: 'cal-1',
    user_id: 'user-1',
    name: 'Default',
    color: '#FF0000',
    is_visible: true,
    is_default: true,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Build a minimal valid Event. */
function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    user_id: 'user-1',
    calendar_id: 'cal-1',
    title: 'Test Event',
    description: null,
    location: null,
    start_time: '2026-04-09T09:00:00',
    end_time: '2026-04-09T10:00:00',
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

const CALENDARS = [makeCalendar()];

// ---------------------------------------------------------------------------
// Helper: offset an ISO date string by N days from TODAY
// ---------------------------------------------------------------------------
function dateOffset(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildWidgetDayGroups', () => {
  // ─── Empty inputs ───────────────────────────────────────────────────────

  describe('empty inputs', () => {
    it('returns an empty array when there are no events or todos', () => {
      const result = buildWidgetDayGroups([], [], [], TODAY);
      expect(result).toEqual([]);
    });

    it('returns an empty array when only calendars are provided', () => {
      const result = buildWidgetDayGroups([], [], CALENDARS, TODAY);
      expect(result).toEqual([]);
    });
  });

  // ─── Event inclusion / exclusion ────────────────────────────────────────

  describe('event filtering', () => {
    it('includes an event starting today (day 0)', () => {
      const event = makeEvent({ start_time: `${dateOffset(0)}T09:00:00`, end_time: `${dateOffset(0)}T10:00:00` });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe(dateOffset(0));
    });

    it('includes an event on day 13 (last day of the window)', () => {
      const event = makeEvent({
        id: 'evt-day13',
        start_time: `${dateOffset(13)}T09:00:00`,
        end_time: `${dateOffset(13)}T10:00:00`,
      });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe(dateOffset(13));
    });

    it('excludes an event on day 14 (one beyond the 14-day window)', () => {
      const event = makeEvent({
        id: 'evt-day14',
        start_time: `${dateOffset(14)}T09:00:00`,
        end_time: `${dateOffset(14)}T10:00:00`,
      });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result).toHaveLength(0);
    });

    it('excludes an event on day 15 (well beyond the window)', () => {
      const event = makeEvent({
        id: 'evt-day15',
        start_time: `${dateOffset(15)}T09:00:00`,
        end_time: `${dateOffset(15)}T10:00:00`,
      });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result).toHaveLength(0);
    });

    it('excludes a soft-deleted event (deleted_at is set)', () => {
      const event = makeEvent({ deleted_at: '2026-04-08T00:00:00Z' });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result).toHaveLength(0);
    });

    it('excludes an event in the past', () => {
      const event = makeEvent({
        start_time: `${dateOffset(-1)}T09:00:00`,
        end_time: `${dateOffset(-1)}T10:00:00`,
      });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result).toHaveLength(0);
    });
  });

  // ─── Todo inclusion / exclusion ─────────────────────────────────────────

  describe('todo filtering', () => {
    it('includes a todo with due_date today and not completed', () => {
      const todo = makeTodo({ due_date: dateOffset(0) });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      expect(result).toHaveLength(1);
      expect(result[0].items[0].type).toBe('todo');
    });

    it('includes a todo with due_date on day 13', () => {
      const todo = makeTodo({ id: 'todo-day13', due_date: dateOffset(13) });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe(dateOffset(13));
    });

    it('excludes a completed todo', () => {
      const todo = makeTodo({ is_completed: true, completed_at: '2026-04-09T08:00:00Z' });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      expect(result).toHaveLength(0);
    });

    it('excludes a soft-deleted todo', () => {
      const todo = makeTodo({ deleted_at: '2026-04-08T00:00:00Z' });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      expect(result).toHaveLength(0);
    });

    it('excludes a todo without a due_date', () => {
      const todo = makeTodo({ due_date: null });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      expect(result).toHaveLength(0);
    });

    it('excludes a todo whose due_date is outside the 14-day window', () => {
      const todo = makeTodo({ id: 'todo-day14', due_date: dateOffset(14) });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      expect(result).toHaveLength(0);
    });

    it('excludes a todo with due_date in the past', () => {
      const todo = makeTodo({ due_date: dateOffset(-1) });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      expect(result).toHaveLength(0);
    });
  });

  // ─── Grouping by date ───────────────────────────────────────────────────

  describe('grouping by date', () => {
    it('groups multiple events on the same day into one group', () => {
      const e1 = makeEvent({ id: 'e1', title: 'Meeting', start_time: `${dateOffset(0)}T09:00:00`, end_time: `${dateOffset(0)}T10:00:00` });
      const e2 = makeEvent({ id: 'e2', title: 'Lunch', start_time: `${dateOffset(0)}T12:00:00`, end_time: `${dateOffset(0)}T13:00:00` });
      const result = buildWidgetDayGroups([e1, e2], [], CALENDARS, TODAY);
      expect(result).toHaveLength(1);
      expect(result[0].items).toHaveLength(2);
    });

    it('puts events on different days into separate groups', () => {
      const e1 = makeEvent({ id: 'e1', start_time: `${dateOffset(0)}T09:00:00`, end_time: `${dateOffset(0)}T10:00:00` });
      const e2 = makeEvent({ id: 'e2', start_time: `${dateOffset(2)}T09:00:00`, end_time: `${dateOffset(2)}T10:00:00` });
      const result = buildWidgetDayGroups([e1, e2], [], CALENDARS, TODAY);
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe(dateOffset(0));
      expect(result[1].date).toBe(dateOffset(2));
    });

    it('returns groups in chronological order', () => {
      const e1 = makeEvent({ id: 'e1', start_time: `${dateOffset(5)}T09:00:00`, end_time: `${dateOffset(5)}T10:00:00` });
      const e2 = makeEvent({ id: 'e2', start_time: `${dateOffset(1)}T09:00:00`, end_time: `${dateOffset(1)}T10:00:00` });
      const result = buildWidgetDayGroups([e1, e2], [], CALENDARS, TODAY);
      expect(result[0].date).toBe(dateOffset(1));
      expect(result[1].date).toBe(dateOffset(5));
    });

    it('can mix events and todos in the same day group', () => {
      const event = makeEvent({ start_time: `${dateOffset(1)}T09:00:00`, end_time: `${dateOffset(1)}T10:00:00` });
      const todo = makeTodo({ due_date: dateOffset(1) });
      const result = buildWidgetDayGroups([event], [todo], CALENDARS, TODAY);
      expect(result).toHaveLength(1);
      expect(result[0].items).toHaveLength(2);
      const types = result[0].items.map((i) => i.type);
      expect(types).toContain('event');
      expect(types).toContain('todo');
    });
  });

  // ─── Sorting within a group ─────────────────────────────────────────────

  describe('sorting within a day group', () => {
    it('sorts events by start time (earlier first)', () => {
      const late = makeEvent({ id: 'late', title: 'Late', start_time: `${dateOffset(0)}T14:00:00`, end_time: `${dateOffset(0)}T15:00:00` });
      const early = makeEvent({ id: 'early', title: 'Early', start_time: `${dateOffset(0)}T08:00:00`, end_time: `${dateOffset(0)}T09:00:00` });
      const result = buildWidgetDayGroups([late, early], [], CALENDARS, TODAY);
      expect(result[0].items[0].id).toBe('early');
      expect(result[0].items[1].id).toBe('late');
    });

    it('places all-day events before timed events', () => {
      const timed = makeEvent({ id: 'timed', title: 'Morning Meeting', start_time: `${dateOffset(0)}T08:00:00`, end_time: `${dateOffset(0)}T09:00:00` });
      const allDay = makeEvent({ id: 'allday', title: 'All Day', start_time: `${dateOffset(0)}T00:00:00`, end_time: `${dateOffset(0)}T23:59:59`, is_all_day: true });
      const result = buildWidgetDayGroups([timed, allDay], [], CALENDARS, TODAY);
      expect(result[0].items[0].id).toBe('allday');
      expect(result[0].items[1].id).toBe('timed');
    });

    it('places todos without due_time before timed todos', () => {
      const timedTodo = makeTodo({ id: 'timed-todo', title: 'Timed Todo', due_date: dateOffset(0), due_time: '10:00:00' });
      const noTimeTodo = makeTodo({ id: 'notime-todo', title: 'No Time Todo', due_date: dateOffset(0), due_time: null });
      const result = buildWidgetDayGroups([], [timedTodo, noTimeTodo], CALENDARS, TODAY);
      expect(result[0].items[0].id).toBe('notime-todo');
      expect(result[0].items[1].id).toBe('timed-todo');
    });

    it('sorts todos by due_time when provided', () => {
      const todo2 = makeTodo({ id: 'todo2', title: 'Later Todo', due_date: dateOffset(0), due_time: '14:00:00' });
      const todo1 = makeTodo({ id: 'todo1', title: 'Earlier Todo', due_date: dateOffset(0), due_time: '09:00:00' });
      const result = buildWidgetDayGroups([], [todo2, todo1], CALENDARS, TODAY);
      expect(result[0].items[0].id).toBe('todo1');
      expect(result[0].items[1].id).toBe('todo2');
    });
  });

  // ─── Item field mapping ─────────────────────────────────────────────────

  describe('item field mapping', () => {
    it('maps event fields correctly', () => {
      const event = makeEvent({
        id: 'evt-x',
        title: 'My Event',
        start_time: `${dateOffset(0)}T09:30:00`,
        end_time: `${dateOffset(0)}T10:45:00`,
        is_all_day: false,
        color: '#ABCDEF',
      });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      const item = result[0].items[0];
      expect(item.id).toBe('evt-x');
      expect(item.type).toBe('event');
      expect(item.title).toBe('My Event');
      expect(item.timeText).toBe('09:30 – 10:45');
      expect(item.color).toBe('#ABCDEF');
      expect(item.isCompleted).toBe(false);
    });

    it('uses calendar color as fallback when event has no color', () => {
      const cal = makeCalendar({ id: 'cal-2', color: '#123456' });
      const event = makeEvent({ calendar_id: 'cal-2', color: null });
      const result = buildWidgetDayGroups([event], [], [cal], TODAY);
      expect(result[0].items[0].color).toBe('#123456');
    });

    it('uses default color #4A90E2 when neither event nor calendar has a color', () => {
      const cal = makeCalendar({ id: 'cal-99', color: '#FF0000' });
      // Use a calendar_id that has no entry in calColor map
      const event = makeEvent({ calendar_id: 'nonexistent-cal', color: null });
      const result = buildWidgetDayGroups([event], [], [cal], TODAY);
      expect(result[0].items[0].color).toBe('#4A90E2');
    });

    it('uses "全天" as timeText for all-day events', () => {
      const event = makeEvent({ is_all_day: true });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result[0].items[0].timeText).toBe('全天');
    });

    it('maps todo fields correctly when due_time is present', () => {
      const todo = makeTodo({
        id: 'todo-x',
        title: 'My Todo',
        due_date: dateOffset(0),
        due_time: '14:30:00',
        color: '#654321',
      });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      const item = result[0].items[0];
      expect(item.id).toBe('todo-x');
      expect(item.type).toBe('todo');
      expect(item.title).toBe('My Todo');
      expect(item.timeText).toBe('14:30');
      expect(item.color).toBe('#654321');
      expect(item.isCompleted).toBe(false);
    });

    it('maps todo timeText to empty string when due_time is null', () => {
      const todo = makeTodo({ due_time: null });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      expect(result[0].items[0].timeText).toBe('');
    });

    it('uses calendar color as fallback for todo with no own color', () => {
      const cal = makeCalendar({ id: 'cal-3', color: '#FEDCBA' });
      const todo = makeTodo({ calendar_id: 'cal-3', color: null });
      const result = buildWidgetDayGroups([], [todo], [cal], TODAY);
      expect(result[0].items[0].color).toBe('#FEDCBA');
    });
  });

  // ─── Label format ───────────────────────────────────────────────────────

  describe('label format', () => {
    it('formats the label as "M月D日 周X" for today (2026-04-09 Thursday)', () => {
      const event = makeEvent();
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      // 2026-04-09 is a Thursday → 周四
      expect(result[0].label).toBe('4月9日 周四');
    });

    it('formats the label correctly for day 1 (2026-04-10 Friday)', () => {
      const event = makeEvent({ id: 'e2', start_time: `${dateOffset(1)}T09:00:00`, end_time: `${dateOffset(1)}T10:00:00` });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result[0].label).toBe('4月10日 周五');
    });

    it('formats the label correctly for day 2 (2026-04-11 Saturday)', () => {
      const event = makeEvent({ id: 'e3', start_time: `${dateOffset(2)}T09:00:00`, end_time: `${dateOffset(2)}T10:00:00` });
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result[0].label).toBe('4月11日 周六');
    });

    it('does not zero-pad month or day in the label', () => {
      // Force a reference date of 2026-01-01 (Thursday)
      const jan1 = new Date(2026, 0, 1, 0, 0, 0, 0);
      const event = makeEvent({ start_time: '2026-01-01T09:00:00', end_time: '2026-01-01T10:00:00' });
      const result = buildWidgetDayGroups([event], [], CALENDARS, jan1);
      // Jan 1 2026 is a Thursday → 周四
      expect(result[0].label).toBe('1月1日 周四');
    });
  });

  // ─── Date field ─────────────────────────────────────────────────────────

  describe('date field', () => {
    it('sets date as YYYY-MM-DD ISO string', () => {
      const event = makeEvent();
      const result = buildWidgetDayGroups([event], [], CALENDARS, TODAY);
      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result[0].date).toBe('2026-04-09');
    });
  });

  // ─── Only non-empty groups returned ─────────────────────────────────────

  describe('only non-empty groups returned', () => {
    it('omits days with no items', () => {
      const e1 = makeEvent({ id: 'e1', start_time: `${dateOffset(0)}T09:00:00`, end_time: `${dateOffset(0)}T10:00:00` });
      const e2 = makeEvent({ id: 'e2', start_time: `${dateOffset(7)}T09:00:00`, end_time: `${dateOffset(7)}T10:00:00` });
      const result = buildWidgetDayGroups([e1, e2], [], CALENDARS, TODAY);
      expect(result).toHaveLength(2);
      // Days 1-6 and 8-13 should be absent
      const dates = result.map((g) => g.date);
      expect(dates).not.toContain(dateOffset(1));
      expect(dates).not.toContain(dateOffset(6));
    });

    it('returns exactly 14 groups when every day has an item', () => {
      const events: Event[] = [];
      for (let i = 0; i < 14; i++) {
        events.push(makeEvent({
          id: `e${i}`,
          start_time: `${dateOffset(i)}T09:00:00`,
          end_time: `${dateOffset(i)}T10:00:00`,
        }));
      }
      const result = buildWidgetDayGroups(events, [], CALENDARS, TODAY);
      expect(result).toHaveLength(14);
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles an event with only one calendar (uses that calendar color)', () => {
      const cal = makeCalendar({ id: 'only-cal', color: '#AABBCC' });
      const event = makeEvent({ calendar_id: 'only-cal', color: null });
      const result = buildWidgetDayGroups([event], [], [cal], TODAY);
      expect(result[0].items[0].color).toBe('#AABBCC');
    });

    it('handles empty calendars array (falls back to default color)', () => {
      const event = makeEvent({ color: null, calendar_id: 'orphaned-cal' });
      const result = buildWidgetDayGroups([event], [], [], TODAY);
      expect(result[0].items[0].color).toBe('#4A90E2');
    });

    it('handles todo due_time longer than 5 chars by slicing to HH:mm', () => {
      const todo = makeTodo({ due_time: '09:30:00' });
      const result = buildWidgetDayGroups([], [todo], CALENDARS, TODAY);
      expect(result[0].items[0].timeText).toBe('09:30');
    });
  });
});
