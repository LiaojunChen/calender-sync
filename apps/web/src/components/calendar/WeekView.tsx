'use client';

import React, { useMemo } from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import { startOfWeek, addDays, startOfDay, endOfDay } from '@project-calendar/shared';
import TimeGrid from './TimeGrid';
import styles from './WeekView.module.css';

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  calendars: Calendar[];
  onCreateEvent?: (startDate: Date, startMinutes: number, endMinutes: number) => void;
  onEventClick?: (event: Event, rect: DOMRect) => void;
  onEventMove?: (eventId: string, newStartMinutes: number, dayOffset: number) => void;
  onEventResize?: (eventId: string, newEndMinutes: number) => void;
}

export default function WeekView({
  currentDate,
  events,
  calendars,
  onCreateEvent,
  onEventClick,
  onEventMove,
  onEventResize,
}: WeekViewProps) {
  // Compute the 7 dates of the week (Monday-first)
  const dates = useMemo(() => {
    const wStart = startOfWeek(currentDate, 1);
    return Array.from({ length: 7 }, (_, i) => addDays(wStart, i));
  }, [currentDate]);

  const calendarMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    for (const c of calendars) {
      map.set(c.id, c);
    }
    return map;
  }, [calendars]);

  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter((c) => c.is_visible).map((c) => c.id)),
    [calendars],
  );

  const filteredEvents = useMemo(() => {
    const weekStart = startOfDay(dates[0]).getTime();
    const weekEnd = endOfDay(dates[6]).getTime();

    return events.filter((ev) => {
      if (!visibleCalendarIds.has(ev.calendar_id)) return false;
      if (ev.deleted_at) return false;
      const evStart = new Date(ev.start_time).getTime();
      const evEnd = new Date(ev.end_time).getTime();
      return evStart < weekEnd && evEnd > weekStart;
    });
  }, [events, dates, visibleCalendarIds]);

  return (
    <div className={styles.weekView}>
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
