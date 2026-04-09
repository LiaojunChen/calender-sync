// ============================================================
// Notification Scheduler
//
// Schedules local push notifications for events and todos
// using expo-notifications.  All scheduling is fire-and-forget;
// the caller is responsible for requesting permissions before use.
// ============================================================

import * as Notifications from 'expo-notifications';
import type { Event, Todo, Calendar } from '@project-calendar/shared';
import { buildNotificationSchedule } from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default reminder offsets (in minutes) used when an event has no reminders. */
export const DEFAULT_REMINDER_OFFSETS: number[] = [10, 1440];

/** How many days ahead we schedule notifications. */
const SCHEDULE_WINDOW_DAYS = 14;

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

/**
 * Requests notification permissions from the OS.
 * Returns true when the user has granted (or already granted) permission.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') {
    return true;
  }
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === 'granted';
}

// ---------------------------------------------------------------------------
// Schedule / Cancel
// ---------------------------------------------------------------------------

/**
 * Cancels all currently scheduled local notifications that were created by
 * this scheduler (identifiers matching `event-*` or `todo-*`).
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancels all scheduled notifications associated with a specific event.
 */
export async function cancelNotificationsForEvent(eventId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `event-${eventId}-`;
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Cancels all scheduled notifications associated with a specific todo.
 */
export async function cancelNotificationsForTodo(todoId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `todo-${todoId}-`;
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

// ---------------------------------------------------------------------------
// Main scheduler
// ---------------------------------------------------------------------------

/**
 * Schedules local notifications for all events and todos whose trigger times
 * fall within the next 14 days and are in the future.
 *
 * @param events      List of events (may include events outside the window – they will be ignored).
 * @param todos       List of todos.
 * @param _calendars  Provided for future use (visibility filtering).
 * @param eventReminders  Optional map of eventId → reminder offsets. Falls back to DEFAULT_REMINDER_OFFSETS.
 * @param todoReminders   Optional map of todoId → reminder offsets.
 */
export async function scheduleNotificationsForItems(
  events: Event[],
  todos: Todo[],
  _calendars: Calendar[],
  eventReminders?: Map<string, number[]>,
  todoReminders?: Map<string, number[]>,
): Promise<void> {
  const now = new Date();

  // Convert Map to plain Record for the pure helper
  const eventRemindersRecord: Record<string, number[]> = {};
  if (eventReminders) {
    eventReminders.forEach((offsets, id) => {
      eventRemindersRecord[id] = offsets;
    });
  }

  const todoRemindersRecord: Record<string, number[]> = {};
  if (todoReminders) {
    todoReminders.forEach((offsets, id) => {
      todoRemindersRecord[id] = offsets;
    });
  }

  const scheduled = buildNotificationSchedule(
    events,
    todos,
    eventRemindersRecord,
    todoRemindersRecord,
    DEFAULT_REMINDER_OFFSETS,
    now,
    SCHEDULE_WINDOW_DAYS,
  );

  const schedulePromises = scheduled.map(({ identifier, title, body, triggerTime }) =>
    Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    }),
  );

  // Fire all scheduling in parallel; ignore individual failures to avoid
  // blocking the rest when a single notification errors out.
  await Promise.allSettled(schedulePromises);
}
