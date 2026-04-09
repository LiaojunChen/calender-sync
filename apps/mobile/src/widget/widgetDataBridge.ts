/**
 * Widget Data Bridge
 *
 * Serialises calendar / todo data into a flat JSON structure that the
 * Android home-screen widget can read from the app's documents directory.
 *
 * The Kotlin CalendarWidgetItemFactory reads the file written here.
 */

import { Directory, File, Paths } from 'expo-file-system';
import type { Calendar, Event, Todo, WidgetDayGroup, WidgetItem } from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Storage key / filename used by both the RN side and the Kotlin widget */
export const WIDGET_DATA_KEY = 'widget_data';

/** Filename written to the documents directory */
const WIDGET_DATA_FILENAME = `${WIDGET_DATA_KEY}.json`;

/** How many days ahead (including today) to include in the widget */
const WIDGET_DAYS_AHEAD = 14;

/** Day names in Chinese, indexed by Date.getDay() (0 = Sunday) */
const WEEKDAY_LABELS_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Return 'YYYY-MM-DD' for a Date object (local time) */
function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Return a human-readable Chinese label, e.g. "4月9日 周四" */
function toDayLabel(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_LABELS_CN[date.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

/** Return HH:mm for a Date */
function toTimeStr(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Core build function
// ---------------------------------------------------------------------------

/**
 * Convert raw events, todos and calendars into a list of WidgetDayGroup
 * objects covering the next WIDGET_DAYS_AHEAD days (today inclusive).
 */
function buildWidgetDayGroups(
  events: Event[],
  todos: Todo[],
  calendars: Calendar[],
): WidgetDayGroup[] {
  // Build a calendar colour map for quick lookup
  const calColor: Record<string, string> = {};
  for (const cal of calendars) {
    calColor[cal.id] = cal.color;
  }

  // Build a date range: today … today + 13 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateRange: string[] = [];
  for (let i = 0; i < WIDGET_DAYS_AHEAD; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serialise the upcoming 14 days of events and todos and persist them so
 * that the Android widget can read the data.
 *
 * Call this after every sync, after creating/editing/deleting an event or
 * todo, and on app foreground.
 */
export async function updateWidgetData(
  events: Event[],
  todos: Todo[],
  calendars: Calendar[],
): Promise<void> {
  const groups = buildWidgetDayGroups(events, todos, calendars);
  const json = JSON.stringify(groups);

  // Ensure the documents directory exists and write the JSON file.
  // Paths.document is the Expo File System v2 equivalent of documentDirectory.
  const dir = new Directory(Paths.document);
  if (!dir.exists) {
    dir.create();
  }
  const file = new File(Paths.document, WIDGET_DATA_FILENAME);
  file.write(json);
}

/**
 * Broadcast a refresh intent so that the Android widget re-reads the data
 * file and redraws itself.
 *
 * On Android this sends a broadcast to the widget provider via a native
 * module.  The implementation is a no-op on iOS and on platforms where the
 * native module is not installed (the widget will pick up changes on its
 * next periodic refresh instead).
 */
export async function triggerWidgetRefresh(): Promise<void> {
  try {
    // Dynamic import so this does not break on iOS / web where the module
    // does not exist.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NativeModules } = require('react-native') as typeof import('react-native');
    const mod = (NativeModules as Record<string, unknown>)['CalendarWidgetModule'];
    if (mod && typeof (mod as Record<string, unknown>)['refresh'] === 'function') {
      await (mod as { refresh: () => Promise<void> }).refresh();
    }
  } catch {
    // Native module not present — widget will refresh on its own schedule
  }
}

/**
 * Convenience function: update widget data and then trigger a refresh.
 * Use this after any operation that changes event/todo data.
 */
export async function broadcastWidgetRefresh(
  events: Event[],
  todos: Todo[],
  calendars: Calendar[],
): Promise<void> {
  await updateWidgetData(events, todos, calendars);
  await triggerWidgetRefresh();
}
