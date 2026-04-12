'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { eventSpansMultipleDays, type Event, type Calendar } from '@project-calendar/shared';
import { isSameDay, isToday } from '@project-calendar/shared';
import EventBlock, { HOUR_HEIGHT } from '@/components/event/EventBlock';
import AllDayArea from './AllDayArea';
import styles from './TimeGrid.module.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** Snap interval in minutes */
const SNAP_MINUTES = 15;

/** Movement threshold for distinguishing click from drag */
const DRAG_THRESHOLD = 5;

interface TimeGridProps {
  /** Array of dates to show (length 1 for day view, 7 for week view) */
  dates: Date[];
  /** Events already filtered by calendar visibility */
  events: Event[];
  /** Calendar map for colour lookup */
  calendarMap: Map<string, Calendar>;
  /** Called when user wants to create an event (click or drag on empty area) */
  onCreateEvent?: (startDate: Date, startMinutes: number, endMinutes: number) => void;
  /** Called when an event is clicked (to show preview) */
  onEventClick?: (event: Event, rect: DOMRect) => void;
  /** Called when an event is dragged to a new time/day */
  onEventMove?: (eventId: string, newStartMinutes: number, dayOffset: number) => void;
  /** Called when an event is resized */
  onEventResize?: (eventId: string, newEndMinutes: number) => void;
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
  const result: LayoutSlot[] = [];
  for (const p of placed) {
    const pStart =
      new Date(p.event.start_time).getHours() * 60 +
      new Date(p.event.start_time).getMinutes();
    const pEnd = p.end;

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

/** Snap a minute value to the nearest SNAP_MINUTES interval */
function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

/**
 * Shared time grid used by both DayView and WeekView.
 */
export default function TimeGrid({
  dates,
  events,
  calendarMap,
  onCreateEvent,
  onEventClick,
  onEventMove,
  onEventResize,
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null);
  const totalHeight = 24 * HOUR_HEIGHT;

  // Ghost block for drag-to-create
  const [ghost, setGhost] = useState<{
    colIdx: number;
    startMin: number;
    endMin: number;
  } | null>(null);

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
      if (ev.is_all_day || eventSpansMultipleDays(ev)) {
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

  // --- Day column width for cross-day drag ---
  const [dayColumnWidth, setDayColumnWidth] = useState(0);
  useEffect(() => {
    if (!columnsRef.current) return;
    const firstCol = columnsRef.current.querySelector('[data-day-column]') as HTMLElement | null;
    if (firstCol) {
      setDayColumnWidth(firstCol.offsetWidth);
    }
    const ro = new ResizeObserver(() => {
      const col = columnsRef.current?.querySelector('[data-day-column]') as HTMLElement | null;
      if (col) setDayColumnWidth(col.offsetWidth);
    });
    ro.observe(columnsRef.current);
    return () => ro.disconnect();
  }, [dates]);

  // --- Click-to-create and drag-to-create on empty area ---
  const handleColumnMouseDown = useCallback(
    (e: React.MouseEvent, colIdx: number) => {
      // Only handle left button clicks on the column itself (not on events)
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('[data-event-block]')) return;

      const columnEl = e.currentTarget as HTMLElement;
      const rect = columnEl.getBoundingClientRect();
      // Capture scroll position at mousedown so we can compensate for
      // any scroll that happens mid-drag (getBoundingClientRect() already
      // accounts for current scroll, so we must NOT add scrollTop here).
      const initialScrollTop = scrollRef.current?.scrollTop ?? 0;
      const relY = e.clientY - rect.top;
      const clickedMinutes = snapMinutes(Math.max(0, (relY / HOUR_HEIGHT) * 60));

      const startY = e.clientY;
      let isDragging = false;
      let cancelled = false;
      let currentEndMin = clickedMinutes + SNAP_MINUTES;

      /** Convert a mousemove/mouseup clientY to content-space minutes */
      function clientYToMinutes(clientY: number): number {
        // Only add the DELTA from the initial scroll (rect is stale from mousedown)
        const scrollDelta = (scrollRef.current?.scrollTop ?? 0) - initialScrollTop;
        const relY2 = clientY - rect.top + scrollDelta;
        return snapMinutes(Math.max(0, Math.min((relY2 / HOUR_HEIGHT) * 60, 24 * 60)));
      }

      const onMouseMove = (me: MouseEvent) => {
        if (cancelled) return;
        const dy = Math.abs(me.clientY - startY);
        if (!isDragging && dy < DRAG_THRESHOLD) return;
        isDragging = true;

        const draggedMinutes = clientYToMinutes(me.clientY);
        const startMin = Math.min(clickedMinutes, draggedMinutes);
        const endMin = Math.max(clickedMinutes, draggedMinutes);

        currentEndMin = endMin;
        setGhost({
          colIdx,
          startMin: Math.max(startMin, 0),
          endMin: Math.min(Math.max(endMin, startMin + SNAP_MINUTES), 24 * 60),
        });
      };

      const onMouseUp = (me: MouseEvent) => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('keydown', onKeyDown);
        setGhost(null);

        if (cancelled) return;

        if (!isDragging) {
          // Click-to-create: default 1-hour duration
          if (onCreateEvent) {
            onCreateEvent(dates[colIdx], clickedMinutes, clickedMinutes + 60);
          }
        } else {
          // Drag-to-create
          if (onCreateEvent) {
            const draggedMinutes = clientYToMinutes(me.clientY);
            const startMin = Math.min(clickedMinutes, draggedMinutes);
            const endMin = Math.max(clickedMinutes, draggedMinutes);
            onCreateEvent(
              dates[colIdx],
              Math.max(startMin, 0),
              Math.min(Math.max(endMin, startMin + SNAP_MINUTES), 24 * 60),
            );
          }
        }
      };

      const onKeyDown = (ke: KeyboardEvent) => {
        if (ke.key === 'Escape') {
          cancelled = true;
          setGhost(null);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          window.removeEventListener('keydown', onKeyDown);
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('keydown', onKeyDown);
    },
    [dates, onCreateEvent],
  );

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
          onEventClick={onEventClick}
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
          <div className={styles.columnsContainer} ref={columnsRef}>
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
                <div
                  key={colIdx}
                  className={colClasses}
                  data-day-column
                  onMouseDown={(e) => handleColumnMouseDown(e, colIdx)}
                >
                  {layout.map((slot) => (
                    <div key={slot.event.id} data-event-block>
                      <EventBlock
                        event={slot.event}
                        calendar={calendarMap.get(slot.event.calendar_id)}
                        colIndex={slot.colIndex}
                        colTotal={slot.colTotal}
                        onClick={onEventClick}
                        onDragMove={onEventMove}
                        onDragResize={onEventResize}
                        dayColumnWidth={dayColumnWidth}
                      />
                    </div>
                  ))}

                  {/* Ghost block for drag-to-create */}
                  {ghost && ghost.colIdx === colIdx && (
                    <div
                      className={styles.ghostBlock}
                      style={{
                        top: `${(ghost.startMin / 60) * HOUR_HEIGHT}px`,
                        height: `${((ghost.endMin - ghost.startMin) / 60) * HOUR_HEIGHT}px`,
                      }}
                    >
                      <span className={styles.ghostTime}>
                        {Math.floor(ghost.startMin / 60)}:
                        {(ghost.startMin % 60).toString().padStart(2, '0')}
                        {' – '}
                        {Math.floor(ghost.endMin / 60)}:
                        {(ghost.endMin % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
