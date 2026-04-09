/**
 * Widget Data Bridge
 *
 * Serialises calendar / todo data into a flat JSON structure that the
 * Android home-screen widget can read from the app's documents directory.
 *
 * The Kotlin CalendarWidgetItemFactory reads the file written here.
 */

import { Directory, File, Paths } from 'expo-file-system';
import type { Calendar, Event, Todo } from '@project-calendar/shared';
import { buildWidgetDayGroups } from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Storage key / filename used by both the RN side and the Kotlin widget */
export const WIDGET_DATA_KEY = 'widget_data';

/** Filename written to the documents directory */
const WIDGET_DATA_FILENAME = `${WIDGET_DATA_KEY}.json`;

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
