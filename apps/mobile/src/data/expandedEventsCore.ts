import type { Event } from '@project-calendar/shared';
import { expandRecurrenceInstances } from '@project-calendar/shared';

export interface EventWithRrule extends Event {
  rrule_string?: string | null;
  _recurringEventId?: string;
  _instanceDate?: string;
}

export interface CalendarEventException {
  event_id: string;
  original_date: string;
  action: 'skip' | 'modify';
  modified_title?: string | null;
  modified_start_time?: string | null;
  modified_end_time?: string | null;
}

export function expandCalendarEvents(
  events: EventWithRrule[],
  rangeStart: Date,
  rangeEnd: Date,
  exceptions: CalendarEventException[] = [],
): EventWithRrule[] {
  const result: EventWithRrule[] = [];
  const exceptionMap = new Map<string, CalendarEventException[]>();

  for (const exception of exceptions) {
    const existing = exceptionMap.get(exception.event_id) ?? [];
    existing.push(exception);
    exceptionMap.set(exception.event_id, existing);
  }

  for (const event of events) {
    if (event.deleted_at) {
      continue;
    }

    if (event.rrule_string) {
      const instances = expandRecurrenceInstances(
        event.rrule_string,
        new Date(event.start_time),
        new Date(event.end_time),
        rangeStart,
        rangeEnd,
        (exceptionMap.get(event.id) ?? []).map((exception) => ({
          original_date: exception.original_date,
          action: exception.action,
          modified_title: exception.modified_title ?? undefined,
          modified_start_time: exception.modified_start_time ?? undefined,
          modified_end_time: exception.modified_end_time ?? undefined,
        })),
      );

      for (const instance of instances) {
        result.push({
          ...event,
          id: `${event.id}::${instance.instanceDate}`,
          start_time: instance.start.toISOString(),
          end_time: instance.end.toISOString(),
          title: instance.modified?.title ?? event.title,
          _recurringEventId: event.id,
          _instanceDate: instance.instanceDate,
        });
      }
      continue;
    }

    const eventStart = new Date(event.start_time).getTime();
    const eventEnd = new Date(event.end_time).getTime();
    if (eventStart < rangeEnd.getTime() && eventEnd > rangeStart.getTime()) {
      result.push(event);
    }
  }

  return result;
}
