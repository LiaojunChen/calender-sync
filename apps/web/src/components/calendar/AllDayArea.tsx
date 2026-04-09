'use client';

import React from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import { isSameDay, isToday, startOfDay } from '@project-calendar/shared';
import { AllDayEventBlock } from '@/components/event/EventBlock';
import styles from './AllDayArea.module.css';

interface AllDayAreaProps {
  /** Array of dates for each column */
  dates: Date[];
  /** All-day events already filtered for visibility */
  allDayEvents: Event[];
  /** Calendar map for colour lookup */
  calendarMap: Map<string, Calendar>;
  /** Called when an all-day event is clicked */
  onEventClick?: (event: Event, rect: DOMRect) => void;
}

/**
 * Check if an all-day event covers a given date.
 */
function eventCoversDate(event: Event, date: Date): boolean {
  const evStart = startOfDay(new Date(event.start_time));
  const evEnd = startOfDay(new Date(event.end_time));
  const d = startOfDay(date);
  return d.getTime() >= evStart.getTime() && d.getTime() <= evEnd.getTime();
}

/**
 * All-day area displayed above the time grid.
 * Shows all-day and multi-day events as horizontal bars.
 */
export default function AllDayArea({
  dates,
  allDayEvents,
  calendarMap,
  onEventClick,
}: AllDayAreaProps) {
  return (
    <div className={styles.allDayArea}>
      <div className={styles.timeLabel}>全天</div>
      <div className={styles.columns}>
        {dates.map((date, colIdx) => {
          const today = isToday(date);
          const eventsForDay = allDayEvents.filter((ev) =>
            eventCoversDate(ev, date),
          );

          // For multi-day events, only render starting block on the first visible day
          // but show in each column that it covers.
          const classNames = [
            styles.column,
            today ? styles.columnToday : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={colIdx} className={classNames}>
              {eventsForDay.map((ev) => {
                const evStart = startOfDay(new Date(ev.start_time));
                const isStartDay = isSameDay(evStart, date);
                const evEnd = startOfDay(new Date(ev.end_time));
                const isEndDay = isSameDay(evEnd, date);

                // Calculate span for multi-day events
                let borderRadius = '4px';
                if (!isStartDay && !isEndDay) {
                  borderRadius = '0';
                } else if (!isStartDay) {
                  borderRadius = '0 4px 4px 0';
                } else if (!isEndDay) {
                  borderRadius = '4px 0 0 4px';
                }

                return (
                  <AllDayEventBlock
                    key={ev.id}
                    event={ev}
                    calendar={calendarMap.get(ev.calendar_id)}
                    style={{ borderRadius }}
                    onClick={onEventClick}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
