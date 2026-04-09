/**
 * Widget Utilities — pure data-transformation functions.
 *
 * This module contains no side effects and no native-module dependencies so
 * that it can be imported and unit-tested in any JavaScript/TypeScript
 * environment (Node, Vitest, etc.).
 */

import type { Calendar, Event, Todo, WidgetDayGroup, WidgetItem } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How many days ahead (including today) to include in the widget */
export const WIDGET_DAYS_AHEAD = 14;

/** Day names in Chinese, indexed by Date.getDay() (0 = Sunday) */
const WEEKDAY_LABELS_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

// ---------------------------------------------------------------------------
// Internal helpers (exported for testing convenience)
// ---------------------------------------------------------------------------

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Return 'YYYY-MM-DD' for a Date object (local time) */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Return a human-readable Chinese label, e.g. "4月9日 周四" */
export function toDayLabel(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_LABELS_CN[date.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

/** Return HH:mm for a Date */
export function toTimeStr(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Core build function
// ---------------------------------------------------------------------------

/**
 * Convert raw events, todos and calendars into a list of WidgetDayGroup
 * objects covering the next WIDGET_DAYS_AHEAD days (today inclusive).
 *
 * @param events     All calendar events for the user.
 * @param todos      All todo items for the user.
 * @param calendars  All calendars (used for fallback colour lookup).
 * @param today      Reference date for "today". Defaults to `new Date()`.
 *                   The time component is irrelevant — only the calendar date
 *                   is used.  Provide an explicit value in tests to make them
 *                   deterministic.
 *
 * @returns An array of WidgetDayGroup values, one per day that has at least
 *          one item, sorted chronologically.
 */
export function buildWidgetDayGroups(
  events: Event[],
  todos: Todo[],
  calendars: Calendar[],
  today: Date = new Date(),
): WidgetDayGroup[] {
  // Build a calendar colour map for quick lookup
  const calColor: Record<string, string> = {};
  for (const cal of calendars) {
    calColor[cal.id] = cal.color;
  }

  // Normalise "today" to midnight so date arithmetic is consistent
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  // Build a date range: todayMidnight … todayMidnight + 13 days (14 days total)
  const dateRange: string[] = [];
  for (let i = 0; i < WIDGET_DAYS_AHEAD; i++) {
    const d = new Date(todayMidnight);
    d.setDate(todayMidnight.getDate() + i);
    dateRange.push(toISODate(d));
  }

  // Initialise one group per day
  const groupMap: Map<string, WidgetDayGroup> = new Map();
  for (const isoDate of dateRange) {
    const d = new Date(`${isoDate}T00:00:00`);
    groupMap.set(isoDate, {
      date: isoDate,
      label: toDayLabel(d),
      items: [],
    });
  }

  // --- Events ---
  for (const ev of events) {
    // Skip soft-deleted events
    if (ev.deleted_at !== null) continue;

    const startDate = new Date(ev.start_time);
    const isoDate = toISODate(startDate);
    const group = groupMap.get(isoDate);
    if (!group) continue; // outside 14-day window

    const endDate = new Date(ev.end_time);
    const timeText = ev.is_all_day
      ? '全天'
      : `${toTimeStr(startDate)} – ${toTimeStr(endDate)}`;

    const item: WidgetItem = {
      id: ev.id,
      type: 'event',
      title: ev.title,
      timeText,
      color: ev.color ?? calColor[ev.calendar_id] ?? '#4A90E2',
      isCompleted: false,
    };
    group.items.push(item);
  }

  // --- Todos ---
  for (const todo of todos) {
    // Skip soft-deleted and completed todos
    if (todo.deleted_at !== null) continue;
    if (todo.is_completed) continue;

    // Only include todos that have a due_date within the window
    if (!todo.due_date) continue;
    const group = groupMap.get(todo.due_date);
    if (!group) continue;

    const timeText = todo.due_time ? todo.due_time.slice(0, 5) : '';

    const item: WidgetItem = {
      id: todo.id,
      type: 'todo',
      title: todo.title,
      timeText,
      color: todo.color ?? calColor[todo.calendar_id] ?? '#4A90E2',
      isCompleted: false,
    };
    group.items.push(item);
  }

  // Sort items within each day by timeText (all-day / empty first, then HH:mm)
  for (const group of groupMap.values()) {
    group.items.sort((a, b) => {
      if (!a.timeText || a.timeText === '全天') return -1;
      if (!b.timeText || b.timeText === '全天') return 1;
      return a.timeText.localeCompare(b.timeText);
    });
  }

  // Return only days that have items (in chronological order)
  return dateRange
    .map((d) => groupMap.get(d)!)
    .filter((g) => g.items.length > 0);
}
