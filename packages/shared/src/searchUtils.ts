/**
 * Search Utilities — pure data-transformation functions for searching events
 * and todos by a query string.
 *
 * No side effects, no native-module dependencies.  Can be imported and tested
 * in any JavaScript/TypeScript environment.
 */

import type { Event, Todo } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  type: 'event' | 'todo';
  title: string;
  /** 'YYYY-MM-DD' derived from the item's primary date (start_time or due_date) */
  date: string;
  /** Formatted time string, e.g. "09:00 – 10:00", "全天", "14:30", or "" */
  timeText: string;
  calendarId: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function matchesQuery(text: string | null | undefined, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q.toLowerCase());
}

/** Return 'YYYY-MM-DD' from an ISO datetime string (local-time interpretation) */
function isoDateFromDatetime(datetime: string): string {
  const d = new Date(datetime);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatEventTimeText(event: Event): string {
  if (event.is_all_day) return '全天';
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  return `${pad(start.getHours())}:${pad(start.getMinutes())} – ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function formatTodoTimeText(todo: Todo): string {
  if (!todo.due_time) return '';
  return todo.due_time.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Core search function
// ---------------------------------------------------------------------------

/**
 * Search events and todos by a free-text query string.
 *
 * Matching rules:
 *  - Case-insensitive substring match against: event title, description,
 *    location; todo title, description.
 *  - Soft-deleted items (deleted_at != null) are excluded.
 *  - Completed todos are still returned if they match (completed ≠ deleted).
 *  - Results are sorted by date ascending (events by start_time, todos by
 *    due_date).  Items without a date sort to the end.
 *  - An empty or whitespace-only query returns an empty array immediately.
 *
 * @param events  All calendar events for the user.
 * @param todos   All todo items for the user.
 * @param query   Free-text search string.
 * @returns       Flat array of matching SearchResult, sorted by date asc.
 */
export function searchEventsAndTodos(
  events: Event[],
  todos: Todo[],
  query: string,
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const results: SearchResult[] = [];

  // --- Events ---
  for (const ev of events) {
    if (ev.deleted_at != null) continue;
    if (
      matchesQuery(ev.title, q) ||
      matchesQuery(ev.description, q) ||
      matchesQuery(ev.location, q)
    ) {
      results.push({
        id: ev.id,
        type: 'event',
        title: ev.title,
        date: isoDateFromDatetime(ev.start_time),
        timeText: formatEventTimeText(ev),
        calendarId: ev.calendar_id,
      });
    }
  }

  // --- Todos ---
  for (const todo of todos) {
    if (todo.deleted_at != null) continue;
    if (matchesQuery(todo.title, q) || matchesQuery(todo.description, q)) {
      results.push({
        id: todo.id,
        type: 'todo',
        title: todo.title,
        date: todo.due_date ?? '',
        timeText: formatTodoTimeText(todo),
        calendarId: todo.calendar_id,
      });
    }
  }

  // Sort by date ascending; items with no date sort to the end
  results.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return results;
}
