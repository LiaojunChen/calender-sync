// ============================================================
// Notification Utilities — Pure scheduling logic
//
// This module contains side-effect-free functions for computing
// which notifications should be scheduled.  The actual call to
// Notifications.scheduleNotificationAsync is left to the mobile
// layer (apps/mobile/src/notifications/scheduler.ts).
// ============================================================

import type { Event, Todo } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ScheduledNotification {
  identifier: string;
  title: string;
  body: string;
  triggerTime: Date;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempts to parse a due_date + optional due_time pair into a Date.
 * Returns null when the date is missing, invalid, or when due_time is absent
 * (because we cannot compute an exact trigger time without a time component).
 */
function parseTodoDueDateTime(
  dueDate: string | null,
  dueTime: string | null,
): Date | null {
  if (!dueDate) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!dateMatch) return null;

  // Require a due_time — without it we cannot pin a specific moment
  if (!dueTime) return null;
  const timeMatch = /^(\d{2}):(\d{2})/.exec(dueTime);
  if (!timeMatch) return null;

  const year = parseInt(dateMatch[1]!, 10);
  const month = parseInt(dateMatch[2]!, 10) - 1;
  const day = parseInt(dateMatch[3]!, 10);
  const hour = parseInt(timeMatch[1]!, 10);
  const minute = parseInt(timeMatch[2]!, 10);

  const d = new Date(year, month, day, hour, minute, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Core pure function
// ---------------------------------------------------------------------------

/**
 * Computes the list of notifications that should be scheduled given the
 * provided events, todos, and reminder configuration.
 *
 * This function is pure: it has no side effects and uses the injected `now`
 * value instead of `new Date()`, making it straightforward to unit-test.
 *
 * @param events           All candidate events.
 * @param todos            All candidate todos.
 * @param eventReminders   Map of eventId → offset_minutes[].
 * @param todoReminders    Map of todoId → offset_minutes[].
 * @param defaultOffsets   Fallback offsets used when an event has no entry in
 *                         eventReminders.
 * @param now              Reference point for "now" (injectable for tests).
 * @param horizonDays      How many days ahead to schedule (default 14).
 * @returns                Array of notifications to schedule, sorted by
 *                         triggerTime ascending.
 */
export function buildNotificationSchedule(
  events: Event[],
  todos: Todo[],
  eventReminders: Record<string, number[]>,
  todoReminders: Record<string, number[]>,
  defaultOffsets: number[],
  now: Date,
  horizonDays: number = 14,
): ScheduledNotification[] {
  const windowEnd = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const result: ScheduledNotification[] = [];

  // ---- Events ----
  for (const event of events) {
    // Skip soft-deleted events
    if (event.deleted_at) continue;

    // Skip all-day events — no specific time to pin a notification to
    if (event.is_all_day) continue;

    const eventStart = new Date(event.start_time);

    const offsets: number[] = eventReminders[event.id] ?? defaultOffsets;

    for (const offsetMinutes of offsets) {
      const triggerTime = new Date(eventStart.getTime() - offsetMinutes * 60 * 1000);

      // Only schedule future trigger times within the window
      if (triggerTime <= now) continue;
      if (triggerTime > windowEnd) continue;

      result.push({
        identifier: `event-${event.id}-${offsetMinutes}`,
        title: event.title,
        body: '即将开始',
        triggerTime,
      });
    }
  }

  // ---- Todos ----
  for (const todo of todos) {
    // Skip soft-deleted and completed todos
    if (todo.deleted_at) continue;
    if (todo.is_completed) continue;

    const dueDateTime = parseTodoDueDateTime(todo.due_date, todo.due_time);
    // Skip todos without a computable due datetime
    if (!dueDateTime) continue;

    // Skip if due datetime is beyond the window
    if (dueDateTime > windowEnd) continue;

    const offsets: number[] = todoReminders[todo.id] ?? [];
    if (offsets.length === 0) continue;

    for (const offsetMinutes of offsets) {
      const triggerTime = new Date(dueDateTime.getTime() - offsetMinutes * 60 * 1000);

      if (triggerTime <= now) continue;
      if (triggerTime > windowEnd) continue;

      result.push({
        identifier: `todo-${todo.id}-${offsetMinutes}`,
        title: todo.title,
        body: '截止时间提醒',
        triggerTime,
      });
    }
  }

  // Return notifications sorted by trigger time ascending
  result.sort((a, b) => a.triggerTime.getTime() - b.triggerTime.getTime());

  return result;
}
