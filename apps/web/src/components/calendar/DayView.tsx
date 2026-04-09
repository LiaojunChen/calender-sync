'use client';

import React, { useMemo } from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import { startOfDay, endOfDay } from '@project-calendar/shared';
import TimeGrid from './TimeGrid';
import styles from './DayView.module.css';

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  calendars: Calendar[];
  onCreateEvent?: (startDate: Date, startMinutes: number, endMinutes: number) => void;
  onEventClick?: (event: Event, rect: DOMRect) => void;
  onEventMove?: (eventId: string, newStartMinutes: number, dayOffset: number) => void;
  onEventResize?: (eventId: string, newEndMinutes: number) => void;
}

export default function DayView({
  currentDate,
  events,
  calendars,
  onCreateEvent,
  onEventClick,
  onEventMove,
  onEventResize,
}: DayViewProps) {
  const dates = useMemo(() => [startOfDay(currentDate)], [currentDate]);

  const calendarMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    for (const c of calendars) {
      map.set(c.id, c);
    }
    return map;
  }, [calendars]);

  // Filter events to this day
  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter((c) => c.is_visible).map((c) => c.id)),
    [calendars],
  );

  const filteredEvents = useMemo(() => {
    const dayStart = startOfDay(currentDate).getTime();
    const dayEnd = endOfDay(currentDate).getTime();

    return events.filter((ev) => {
      if (!visibleCalendarIds.has(ev.calendar_id)) return false;
      if (ev.deleted_at) return false;
      const evStart = new Date(ev.start_time).getTime();
      const evEnd = new Date(ev.end_time).getTime();
      return evStart < dayEnd && evEnd > dayStart;
    });
  }, [events, currentDate, visibleCalendarIds]);

  return (
    <div className={styles.dayView}>
      <TimeGrid
        dates={dates}
        events={filteredEvents}
        calendarMap={calendarMap}
        onCreateEvent={onCreateEvent}
        onEventClick={onEventClick}
        onEventMove={onEventMove}
        onEventResize={onEventResize}
      />
    </div>
  );
}
