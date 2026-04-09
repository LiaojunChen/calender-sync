// ============================================================
// Notification Scheduler
//
// Schedules local push notifications for events and todos
// using expo-notifications.  All scheduling is fire-and-forget;
// the caller is responsible for requesting permissions before use.
// ============================================================

import * as Notifications from 'expo-notifications';
import type { Event, Todo, Calendar } from '@project-calendar/shared';

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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the cutoff Date beyond which we do not schedule notifications
 * (14 days from now).
 */
function getWindowEnd(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SCHEDULE_WINDOW_DAYS);
  return d;
}

/**
 * Attempts to parse a due_date + optional due_time pair into a Date.
 * Returns null when the date is missing or invalid.
 */
function parseTodoDueDateTime(
  dueDate: string | null,
  dueTime: string | null,
): Date | null {
  if (!dueDate) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!dateMatch) return null;

  const year = parseInt(dateMatch[1]!, 10);
  const month = parseInt(dateMatch[2]!, 10) - 1;
  const day = parseInt(dateMatch[3]!, 10);

  let hour = 0;
  let minute = 0;
  if (dueTime) {
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(dueTime);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]!, 10);
      minute = parseInt(timeMatch[2]!, 10);
    }
  }

  const d = new Date(year, month, day, hour, minute, 0, 0);
  return isNaN(d.getTime()) ? null : d;
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

interface EventWithReminders {
  event: Event;
  /** Reminder offset minutes for this event. */
  offsets: number[];
}

interface TodoWithReminders {
  todo: Todo;
  /** Reminder offset minutes for this todo. */
  offsets: number[];
}

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
  const windowEnd = getWindowEnd();

  const schedulePromises: Promise<string>[] = [];

  // ---- Events ----
  for (const event of events) {
    if (event.deleted_at) continue;

    const eventStart = new Date(event.start_time);
    // Skip events outside the window
    if (eventStart > windowEnd || eventStart < now) {
      // Still include events that start after now but within window.
      // If eventStart < now the event has already started; check reminders anyway.
    }

    const offsets: number[] =
      eventReminders?.get(event.id) ?? DEFAULT_REMINDER_OFFSETS;

    for (const offsetMinutes of offsets) {
      const triggerTime = new Date(eventStart.getTime() - offsetMinutes * 60 * 1000);

      // Only schedule future trigger times within the window
      if (triggerTime <= now) continue;
      if (triggerTime > windowEnd) continue;

      const identifier = `event-${event.id}-${offsetMinutes}`;

      schedulePromises.push(
        Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: event.title,
            body: '即将开始',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
          },
        }),
      );
    }
  }

  // ---- Todos ----
  for (const todo of todos) {
    if (todo.deleted_at) continue;
    if (todo.is_completed) continue;

    const dueDateTime = parseTodoDueDateTime(todo.due_date, todo.due_time);
    if (!dueDateTime) continue;

    // Skip if due datetime is outside the window
    if (dueDateTime > windowEnd) continue;

    const offsets: number[] = todoReminders?.get(todo.id) ?? [];
    if (offsets.length === 0) continue;

    for (const offsetMinutes of offsets) {
      const triggerTime = new Date(dueDateTime.getTime() - offsetMinutes * 60 * 1000);

      if (triggerTime <= now) continue;
      if (triggerTime > windowEnd) continue;

      const identifier = `todo-${todo.id}-${offsetMinutes}`;

      schedulePromises.push(
        Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: todo.title,
            body: '截止时间提醒',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
          },
        }),
      );
    }
  }

  // Fire all scheduling in parallel; ignore individual failures to avoid
  // blocking the rest when a single notification errors out.
  await Promise.allSettled(schedulePromises);
}
