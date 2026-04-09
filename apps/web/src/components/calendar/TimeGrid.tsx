'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import { isSameDay, isToday } from '@project-calendar/shared';
import EventBlock, { HOUR_HEIGHT } from '@/components/event/EventBlock';
import AllDayArea from './AllDayArea';
import styles from './TimeGrid.module.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

interface TimeGridProps {
  /** Array of dates to show (length 1 for day view, 7 for week view) */
  dates: Date[];
  /** Events already filtered by calendar visibility */
  events: Event[];
  /** Calendar map for colour lookup */
  calendarMap: Map<string, Calendar>;
}

// ------------------------------------------------------------------
// Overlap detection
// ------------------------------------------------------------------

interface LayoutSlot {
  event: Event;
  colIndex: number;
  colTotal: number;
}

/**
 * Given a list of timed events for a single day, compute layout columns
 * so overlapping events are placed side-by-side.
 */
function layoutEvents(events: Event[]): LayoutSlot[] {
  if (events.length === 0) return [];

  // Sort by start time, then by duration descending
  const sorted = [...events].sort((a, b) => {
    const diff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    if (diff !== 0) return diff;
    // Longer events first
    return (
      new Date(b.end_time).getTime() -
      new Date(b.start_time).getTime() -
      (new Date(a.end_time).getTime() - new Date(a.start_time).getTime())
    );
  });

  // Each placed event records its column assignment
  const placed: { event: Event; col: number; end: number }[] = [];
  // Columns track current end time
  const columns: number[] = [];

  for (const ev of sorted) {
    const start = new Date(ev.start_time).getHours() * 60 + new Date(ev.start_time).getMinutes();
    const end = new Date(ev.end_time).getHours() * 60 + new Date(ev.end_time).getMinutes();
    const evEnd = Math.max(end, start + 15); // minimum 15min for overlap detection

    // Find the first column where this event fits
    let col = -1;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c] <= start) {
        col = c;
        break;
      }
    }
    if (col === -1) {
      col = columns.length;
      columns.push(0);
    }
    columns[col] = evEnd;
    placed.push({ event: ev, col, end: evEnd });
  }

  // Now, for each event determine the total columns in its overlap group.
  // We do a second pass: for each event find all overlapping events and take
  // the max column among them + 1.
  const result: LayoutSlot[] = [];
  for (const p of placed) {
    const pStart =
      new Date(p.event.start_time).getHours() * 60 +
      new Date(p.event.start_time).getMinutes();
    const pEnd = p.end;

    // Find max column among all overlapping placed events
    let maxCol = p.col;
    for (const q of placed) {
      const qStart =
        new Date(q.event.start_time).getHours() * 60 +
        new Date(q.event.start_time).getMinutes();
      const qEnd = q.end;
      if (pStart < qEnd && qStart < pEnd) {
        maxCol = Math.max(maxCol, q.col);
      }
    }
    result.push({
      event: p.event,
      colIndex: p.col,
      colTotal: maxCol + 1,
    });
  }

  return result;
}

/**
 * Shared time grid used by both DayView and WeekView.
 */
export default function TimeGrid({
  dates,
  events,
  calendarMap,
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null);
  const totalHeight = 24 * HOUR_HEIGHT;

  // --- Current time indicator ---
  useEffect(() => {
    function update() {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      setCurrentTimeTop((mins / 60) * HOUR_HEIGHT);
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to ~8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT - 20;
    }
  }, []);

  // --- Separate all-day vs timed events ---
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: Event[] = [];
    const timed: Event[] = [];
    for (const ev of events) {
      if (ev.is_all_day) {
        allDay.push(ev);
      } else {
        timed.push(ev);
      }
    }
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events]);

  // --- Per-day timed event layout ---
  const dayLayouts = useMemo(() => {
    return dates.map((date) => {
      const dayEvents = timedEvents.filter((ev) =>
        isSameDay(new Date(ev.start_time), date),
      );
      return layoutEvents(dayEvents);
    });
  }, [dates, timedEvents]);

  // --- Today column index ---
  const todayColIndex = useMemo(() => {
    return dates.findIndex((d) => isToday(d));
  }, [dates]);

  return (
    <div className={styles.container}>
      {/* Column headers */}
      <div className={styles.headerRow}>
        <div className={styles.headerTimeLabel} />
        <div className={styles.headerColumns}>
          {dates.map((date, idx) => {
            const today = isToday(date);
            return (
              <div key={idx} className={styles.headerCell}>
                <span
                  className={
                    today
                      ? `${styles.headerDayName} ${styles.headerDayNameToday}`
                      : styles.headerDayName
                  }
                >
                  {DAY_NAMES[date.getDay()]}
                </span>
                <span
                  className={
                    today
                      ? `${styles.headerDateNum} ${styles.headerDateNumToday}`
                      : styles.headerDateNum
                  }
                >
                  {date.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* All-day area */}
      {allDayEvents.length > 0 && (
        <AllDayArea
          dates={dates}
          allDayEvents={allDayEvents}
          calendarMap={calendarMap}
        />
      )}

      {/* Scrollable time grid */}
      <div className={styles.scrollArea} ref={scrollRef}>
        <div className={styles.gridBody} style={{ height: `${totalHeight}px` }}>
          {/* Time labels */}
          <div className={styles.timeLabels}>
            {HOURS.map((h) => (
              <div
                key={h}
                className={styles.timeLabel}
                style={{ top: `${h * HOUR_HEIGHT}px` }}
              >
                {h === 0 ? '' : `${h}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className={styles.columnsContainer}>
            {/* Grid lines (drawn once behind all columns) */}
            {HOURS.map((h) => (
              <React.Fragment key={h}>
                <div
                  className={styles.hourLine}
                  style={{ top: `${h * HOUR_HEIGHT}px` }}
                />
                <div
                  className={styles.halfHourLine}
                  style={{ top: `${h * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                />
              </React.Fragment>
            ))}

            {/* Current time line */}
            {currentTimeTop !== null && todayColIndex >= 0 && (
              <div
                className={styles.currentTimeLine}
                style={{ top: `${currentTimeTop}px` }}
              >
                <div className={styles.currentTimeDot} />
              </div>
            )}

            {/* Columns */}
            {dates.map((date, colIdx) => {
              const today = isToday(date);
              const layout = dayLayouts[colIdx];
              const colClasses = [
                styles.dayColumn,
                today ? styles.dayColumnToday : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div key={colIdx} className={colClasses}>
                  {layout.map((slot) => (
                    <EventBlock
                      key={slot.event.id}
                      event={slot.event}
                      calendar={calendarMap.get(slot.event.calendar_id)}
                      colIndex={slot.colIndex}
                      colTotal={slot.colTotal}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
