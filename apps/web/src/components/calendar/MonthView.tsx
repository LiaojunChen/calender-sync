'use client';

import React, { useMemo, useCallback } from 'react';
import type { Event, Calendar, Todo } from '@project-calendar/shared';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  formatTime,
} from '@project-calendar/shared';
import { useAppContext } from '@/contexts/AppContext';
import styles from './MonthView.module.css';

const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const MAX_VISIBLE_EVENTS = 3;

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  calendars: Calendar[];
  todos?: Todo[];
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Check whether an event spans more than one calendar day */
function isMultiDay(ev: Event): boolean {
  const s = startOfDay(new Date(ev.start_time));
  const e = startOfDay(new Date(ev.end_time));
  return e.getTime() > s.getTime();
}

/** Does the event cover a given date? */
function eventCoversDate(ev: Event, date: Date): boolean {
  const evStart = startOfDay(new Date(ev.start_time)).getTime();
  const evEnd = startOfDay(new Date(ev.end_time)).getTime();
  const d = startOfDay(date).getTime();
  return d >= evStart && d <= evEnd;
}

/**
 * Get the column indices (0-based from grid start) that a multi-day
 * event spans within a given week row.
 */
function getSpan(
  ev: Event,
  weekDates: Date[],
): { startCol: number; endCol: number } | null {
  const evStart = startOfDay(new Date(ev.start_time));
  const evEnd = startOfDay(new Date(ev.end_time));
  const weekStart = startOfDay(weekDates[0]);
  const weekEnd = startOfDay(weekDates[6]);

  // Event doesn't overlap this week
  if (evEnd.getTime() < weekStart.getTime() || evStart.getTime() > weekEnd.getTime()) {
    return null;
  }

  const startCol = evStart.getTime() < weekStart.getTime()
    ? 0
    : weekDates.findIndex((d) => isSameDay(d, evStart));

  const endCol = evEnd.getTime() > weekEnd.getTime()
    ? 6
    : weekDates.findIndex((d) => isSameDay(d, evEnd));

  if (startCol < 0 || endCol < 0) return null;
  return { startCol, endCol };
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function MonthView({ currentDate, events, calendars, todos = [] }: MonthViewProps) {
  const { setView, setDate } = useAppContext();

  const calendarMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    for (const c of calendars) map.set(c.id, c);
    return map;
  }, [calendars]);

  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter((c) => c.is_visible).map((c) => c.id)),
    [calendars],
  );

  // Build the 6×7 grid of dates
  const gridDates = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, 1); // Monday start
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [currentDate]);

  // Split into weeks (rows)
  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < 42; i += 7) {
      rows.push(gridDates.slice(i, i + 7));
    }
    return rows;
  }, [gridDates]);

  // Filter events once for the visible date range
  const filteredEvents = useMemo(() => {
    const gridStart = startOfDay(gridDates[0]).getTime();
    const gridEnd = startOfDay(gridDates[41]).getTime() + 86400000; // end of last day

    return events.filter((ev) => {
      if (!visibleCalendarIds.has(ev.calendar_id)) return false;
      if (ev.deleted_at) return false;
      const evStart = new Date(ev.start_time).getTime();
      const evEnd = new Date(ev.end_time).getTime();
      return evStart < gridEnd && evEnd > gridStart;
    });
  }, [events, gridDates, visibleCalendarIds]);

  // Filter todos for the visible grid
  const filteredTodos = useMemo(() => {
    const gridStartStr = gridDates[0].toISOString().substring(0, 10);
    const gridEndStr = gridDates[41].toISOString().substring(0, 10);

    return todos.filter((t) => {
      if (t.deleted_at) return false;
      if (!t.due_date) return false;
      if (!visibleCalendarIds.has(t.calendar_id)) return false;
      return t.due_date >= gridStartStr && t.due_date <= gridEndStr;
    });
  }, [todos, gridDates, visibleCalendarIds]);

  // Separate multi-day and single-day events
  const { multiDayEvents, singleDayEvents } = useMemo(() => {
    const multi: Event[] = [];
    const single: Event[] = [];
    for (const ev of filteredEvents) {
      if (isMultiDay(ev) || ev.is_all_day) {
        multi.push(ev);
      } else {
        single.push(ev);
      }
    }
    // Sort multi-day events by duration descending (longer bars first)
    multi.sort((a, b) => {
      const durA = new Date(a.end_time).getTime() - new Date(a.start_time).getTime();
      const durB = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
      return durB - durA;
    });
    // Sort single-day events by start time
    single.sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
    return { multiDayEvents: multi, singleDayEvents: single };
  }, [filteredEvents]);

  // Click handler for date cell
  const handleDateClick = useCallback(
    (date: Date) => {
      setDate(date);
      setView('day');
    },
    [setDate, setView],
  );

  /**
   * Get the event color (event override > calendar color > fallback)
   */
  function getEventColor(ev: Event): string {
    if (ev.color) return ev.color;
    const cal = calendarMap.get(ev.calendar_id);
    return cal?.color ?? '#1a73e8';
  }

  // ----------------------------------------------------------------
  // Render helpers
  // ----------------------------------------------------------------

  function renderWeekRow(weekDates: Date[], weekIdx: number) {
    // Compute multi-day bar layout for this week row.
    // Each bar occupies a "row slot" within the events area.
    // We greedily assign each multi-day event the earliest available row slot.
    type BarInfo = {
      ev: Event;
      startCol: number;
      endCol: number;
      row: number;
    };
    const bars: BarInfo[] = [];
    // Track occupied slots: row -> array of occupied column ranges
    const rowOccupied: Array<Array<[number, number]>> = [];

    for (const ev of multiDayEvents) {
      const span = getSpan(ev, weekDates);
      if (!span) continue;

      // Find earliest row that has no overlap
      let row = 0;
      while (true) {
        if (!rowOccupied[row]) rowOccupied[row] = [];
        const conflict = rowOccupied[row].some(
          ([s, e]) => span.startCol <= e && span.endCol >= s,
        );
        if (!conflict) break;
        row++;
      }
      rowOccupied[row].push([span.startCol, span.endCol]);
      bars.push({ ev, startCol: span.startCol, endCol: span.endCol, row });
    }

    const maxBarRow = bars.length > 0 ? Math.max(...bars.map((b) => b.row)) : -1;

    // For each date cell, collect its items
    return weekDates.map((date, colIdx) => {
      const dayIsToday = isToday(date);
      const isCurrentMonth = isSameMonth(date, currentDate);

      // Multi-day bars that appear in this column
      const barsInCol = bars.filter(
        (b) => colIdx >= b.startCol && colIdx <= b.endCol,
      );

      // Single-day events for this date
      const dayEvents = singleDayEvents.filter((ev) =>
        isSameDay(new Date(ev.start_time), date),
      );

      // Build the multi-day rows (fill gaps with spacers)
      const multiDaySlots: React.ReactNode[] = [];
      for (let row = 0; row <= maxBarRow; row++) {
        const bar = barsInCol.find((b) => b.row === row);
        if (bar && colIdx === bar.startCol) {
          // Render the actual bar
          const colSpan = bar.endCol - bar.startCol + 1;
          const color = getEventColor(bar.ev);
          const continues = bar.endCol < 6 &&
            startOfDay(new Date(bar.ev.end_time)).getTime() >
              startOfDay(weekDates[bar.endCol]).getTime();
          const isContinuation = bar.startCol > 0 &&
            startOfDay(new Date(bar.ev.start_time)).getTime() <
              startOfDay(weekDates[0]).getTime();

          const barClasses = [
            styles.multiDayBar,
            isContinuation ? styles.multiDayBarContinuation : '',
            continues ? styles.multiDayBarContinues : '',
          ].filter(Boolean).join(' ');

          multiDaySlots.push(
            <div
              key={`bar-${bar.ev.id}-${row}`}
              className={barClasses}
              style={{
                backgroundColor: color,
                width: `calc(${colSpan * 100}% + ${(colSpan - 1)}px)`,
                position: 'relative',
                zIndex: 1,
              }}
              title={bar.ev.title}
            >
              <span className={styles.multiDayBarTitle}>{bar.ev.title}</span>
            </div>,
          );
        } else if (bar) {
          // This column is covered by a bar starting earlier - show spacer
          multiDaySlots.push(
            <div key={`spacer-${row}`} className={styles.multiDaySpacer} />,
          );
        } else {
          // Empty row slot
          multiDaySlots.push(
            <div key={`spacer-${row}`} className={styles.multiDaySpacer} />,
          );
        }
      }

      // Todos for this date
      const dateStr = date.toISOString().substring(0, 10);
      const dayTodos = filteredTodos.filter((t) => t.due_date === dateStr);

      // Total items for overflow calculation
      const multiDayCount = barsInCol.length;
      const totalItems = multiDayCount + dayEvents.length + dayTodos.length;
      const remainingSlots = Math.max(0, MAX_VISIBLE_EVENTS - (maxBarRow + 1));
      const visibleDayEvents = dayEvents.slice(0, remainingSlots);
      const remainingSlotsAfterEvents = Math.max(0, remainingSlots - visibleDayEvents.length);
      const visibleDayTodos = dayTodos.slice(0, remainingSlotsAfterEvents);
      const overflowCount = totalItems - (maxBarRow + 1) - visibleDayEvents.length - visibleDayTodos.length;

      const dateNumberClasses = [
        styles.dateNumber,
        dayIsToday ? styles.dateNumberToday : '',
        !isCurrentMonth ? styles.dateNumberOtherMonth : '',
      ].filter(Boolean).join(' ');

      return (
        <div
          key={`${weekIdx}-${colIdx}`}
          className={styles.dateCell}
          onClick={() => handleDateClick(date)}
        >
          <div className={styles.dateHeader}>
            <span className={dateNumberClasses}>
              {date.getDate()}
            </span>
          </div>
          <div className={styles.eventsArea}>
            {multiDaySlots}
            {visibleDayEvents.map((ev) => {
              const color = getEventColor(ev);
              const evStart = new Date(ev.start_time);
              return (
                <div
                  key={ev.id}
                  className={styles.eventEntry}
                  title={ev.title}
                >
                  <span className={styles.eventDot} style={{ backgroundColor: color }} />
                  <span className={styles.eventTime}>{formatTime(evStart)}</span>
                  <span className={styles.eventTitle}>{ev.title}</span>
                </div>
              );
            })}
            {visibleDayTodos.map((todo) => {
              const todoColor = todo.color ?? calendarMap.get(todo.calendar_id)?.color ?? '#1a73e8';
              return (
                <div
                  key={todo.id}
                  className={styles.todoEntry}
                  title={todo.title}
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg
                    className={styles.todoCheckIcon}
                    viewBox="0 0 14 14"
                    width="11"
                    height="11"
                    style={{ flexShrink: 0 }}
                  >
                    {todo.is_completed ? (
                      <>
                        <rect x="0.5" y="0.5" width="13" height="13" rx="2" fill={todoColor} />
                        <path d="M3 7l2.5 2.5L11 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </>
                    ) : (
                      <rect x="0.5" y="0.5" width="13" height="13" rx="2" fill="none" stroke={todoColor} strokeWidth="1.2" />
                    )}
                  </svg>
                  <span className={styles.todoEntryTitle}>{todo.title}</span>
                </div>
              );
            })}
            {overflowCount > 0 && (
              <div
                className={styles.moreLink}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDateClick(date);
                }}
              >
                +{overflowCount} 更多
              </div>
            )}
          </div>
        </div>
      );
    });
  }

  return (
    <div className={styles.monthView}>
      {/* Day-of-week header */}
      <div className={styles.headerRow}>
        {DAY_NAMES.map((name) => (
          <div key={name} className={styles.headerCell}>
            {name}
          </div>
        ))}
      </div>

      {/* Grid of date cells */}
      <div className={styles.gridBody}>
        {weeks.map((weekDates, weekIdx) => renderWeekRow(weekDates, weekIdx))}
      </div>
    </div>
  );
}
