'use client';

import { useMemo } from 'react';
import type { Event } from '@project-calendar/shared';
import { expandRecurrenceInstances } from '@project-calendar/shared';

/**
 * Extended Event with optional embedded RRULE string.
 * Used in demo mode where we don't have a separate recurrence_rules table row.
 */
export interface EventWithRrule extends Event {
  /** RRULE string (e.g. "FREQ=WEEKLY;BYDAY=MO") — set for recurring events */
  rrule_string?: string | null;
  /** If this is a synthetic instance from expansion, the original event id */
  _recurringEventId?: string;
  /** Instance date (YYYY-MM-DD) for recurring instances */
  _instanceDate?: string;
}

/**
 * Exception record stored locally for demo mode.
 */
export interface LocalException {
  event_id: string;
  original_date: string;
  action: 'skip' | 'modify';
  modified_title?: string | null;
  modified_start_time?: string | null;
  modified_end_time?: string | null;
}

/**
 * Expand all recurring events in [rangeStart, rangeEnd] and merge with
 * non-recurring events filtered to that range.
 *
 * Returns a flat array of EventWithRrule that can be passed to any view.
 * Each recurring instance is represented as a separate event-like object with:
 *  - start_time / end_time overridden to the instance's actual time
 *  - id suffixed with `-${instanceDate}` for uniqueness
 *  - _recurringEventId pointing back to the parent event
 *  - _instanceDate set to 'YYYY-MM-DD'
 */
export function useExpandedEvents(
  events: EventWithRrule[],
  rangeStart: Date,
  rangeEnd: Date,
  exceptions: LocalException[] = [],
): EventWithRrule[] {
  return useMemo(() => {
    const result: EventWithRrule[] = [];

    // Build exception map per event_id
    const exMap = new Map<string, LocalException[]>();
    for (const ex of exceptions) {
      const arr = exMap.get(ex.event_id) ?? [];
      arr.push(ex);
      exMap.set(ex.event_id, arr);
    }

    for (const ev of events) {
      if (ev.deleted_at) continue;

      if (ev.rrule_string) {
        // Expand recurrence instances
        const eventStart = new Date(ev.start_time);
        const eventEnd = new Date(ev.end_time);
        const eventExceptions = (exMap.get(ev.id) ?? []).map((e) => ({
          original_date: e.original_date,
          action: e.action,
          modified_start_time: e.modified_start_time ?? undefined,
          modified_end_time: e.modified_end_time ?? undefined,
          modified_title: e.modified_title ?? undefined,
        }));

        const instances = expandRecurrenceInstances(
          ev.rrule_string,
          eventStart,
          eventEnd,
          rangeStart,
          rangeEnd,
          eventExceptions,
        );

        for (const inst of instances) {
          const instanceEvent: EventWithRrule = {
            ...ev,
            id: `${ev.id}::${inst.instanceDate}`,
            start_time: inst.start.toISOString(),
            end_time: inst.end.toISOString(),
            title: inst.modified?.title ?? ev.title,
            _recurringEventId: ev.id,
            _instanceDate: inst.instanceDate,
          };
          result.push(instanceEvent);
        }
      } else {
        // Non-recurring: only include if in range
        const evStart = new Date(ev.start_time).getTime();
        const evEnd = new Date(ev.end_time).getTime();
        if (evStart < rangeEnd.getTime() && evEnd > rangeStart.getTime()) {
          result.push(ev);
        }
      }
    }

    return result;
  }, [events, rangeStart, rangeEnd, exceptions]);
}
