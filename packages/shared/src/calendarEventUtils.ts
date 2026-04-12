import { endOfDay, isSameDay } from './date-utils';
import type { Event } from './types';

type EventBounds = Pick<Event, 'start_time' | 'end_time'>;

/**
 * Whether an event occupies more than one visible calendar day.
 *
 * End times are treated as exclusive so an event ending exactly at 00:00 of the
 * next day is still considered a single-day event.
 */
export function eventSpansMultipleDays(event: EventBounds): boolean {
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const visibleEnd = new Date(Math.max(start.getTime(), end.getTime() - 1));
  return !isSameDay(start, visibleEnd);
}

/**
 * Whether an event overlaps the calendar day represented by `date`.
 */
export function eventIntersectsDay(event: EventBounds, date: Date): boolean {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = endOfDay(date);

  const eventStart = new Date(event.start_time).getTime();
  const eventEnd = new Date(event.end_time).getTime();

  return eventStart <= dayEnd.getTime() && eventEnd > dayStart.getTime();
}
