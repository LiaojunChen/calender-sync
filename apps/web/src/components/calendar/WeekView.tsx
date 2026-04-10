'use client';

import React, { useMemo } from 'react';
import type { Event, Calendar, Todo } from '@project-calendar/shared';
import { startOfWeek, addDays, startOfDay, endOfDay, toISODateString, isToday } from '@project-calendar/shared';
import TimeGrid from './TimeGrid';
import styles from './WeekView.module.css';

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  calendars: Calendar[];
  todos?: Todo[];
  onCreateEvent?: (startDate: Date, startMinutes: number, endMinutes: number) => void;
  onEventClick?: (event: Event, rect: DOMRect) => void;
  onEventMove?: (eventId: string, newStartMinutes: number, dayOffset: number) => void;
  onEventResize?: (eventId: string, newEndMinutes: number) => void;
  onToggleTodo?: (todo: Todo) => void;
}

export default function WeekView({
  currentDate,
  events,
  calendars,
  todos = [],
  onCreateEvent,
  onEventClick,
  onEventMove,
  onEventResize,
  onToggleTodo,
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

  // Filter todos for this week
  const weekTodosByDay = useMemo(() => {
    const byDay = new Map<string, Todo[]>();
    for (const date of dates) {
      byDay.set(toISODateString(date), []);
    }
    for (const t of todos) {
      if (t.deleted_at || !t.due_date) continue;
      if (!visibleCalendarIds.has(t.calendar_id)) continue;
      const list = byDay.get(t.due_date);
      if (list) list.push(t);
    }
    return byDay;
  }, [todos, dates, visibleCalendarIds]);

  const hasTodos = useMemo(
    () => [...weekTodosByDay.values()].some((list) => list.length > 0),
    [weekTodosByDay],
  );

  return (
    <div className={styles.weekView}>
      {/* Todos strip — only shown when there are todos this week */}
      {hasTodos && (
        <div className={styles.todoStrip}>
          <div className={styles.todoStripGutter} />
          <div className={styles.todoStripColumns}>
            {dates.map((date) => {
              const dateStr = toISODateString(date);
              const dayTodos = weekTodosByDay.get(dateStr) ?? [];
              const todayClass = isToday(date) ? styles.todoColumnToday : '';
              return (
                <div key={dateStr} className={`${styles.todoColumn} ${todayClass}`}>
                  {dayTodos.map((todo) => {
                    const todoColor = todo.color ?? calendarMap.get(todo.calendar_id)?.color ?? '#1a73e8';
                    return (
                      <div
                        key={todo.id}
                        className={`${styles.todoChip} ${todo.is_completed ? styles.todoChipDone : ''}`}
                        title={todo.title}
                      >
                        <button
                          type="button"
                          className={styles.todoChipCheck}
                          onClick={() => onToggleTodo?.(todo)}
                          title={todo.is_completed ? '标记为未完成' : '标记为完成'}
                        >
                          <svg viewBox="0 0 14 14" width="10" height="10">
                            {todo.is_completed ? (
                              <>
                                <rect x="0.5" y="0.5" width="13" height="13" rx="2" fill={todoColor} />
                                <path d="M3 7l2.5 2.5L11 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </>
                            ) : (
                              <rect x="0.5" y="0.5" width="13" height="13" rx="2" fill="none" stroke={todoColor} strokeWidth="1.2" />
                            )}
                          </svg>
                        </button>
                        <span className={styles.todoChipTitle}>{todo.title}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
