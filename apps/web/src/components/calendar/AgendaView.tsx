'use client';

import React, { useMemo } from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import {
  addDays,
  startOfDay,
  endOfDay,
  isSameDay,
  isToday,
  formatTime,
} from '@project-calendar/shared';
import styles from './AgendaView.module.css';

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const AGENDA_DAYS = 30;

interface AgendaViewProps {
  currentDate: Date;
  events: Event[];
  calendars: Calendar[];
}

interface DayGroup {
  date: Date;
  events: Event[];
}

export default function AgendaView({ currentDate, events, calendars }: AgendaViewProps) {
  const calendarMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    for (const c of calendars) map.set(c.id, c);
    return map;
  }, [calendars]);

  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter((c) => c.is_visible).map((c) => c.id)),
    [calendars],
  );

  // Generate dates for the next AGENDA_DAYS days starting from currentDate
  const dates = useMemo(() => {
    const start = startOfDay(currentDate);
    return Array.from({ length: AGENDA_DAYS }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Filter events within the agenda window
  const filteredEvents = useMemo(() => {
    const rangeStart = startOfDay(dates[0]).getTime();
    const rangeEnd = endOfDay(dates[dates.length - 1]).getTime();

    return events.filter((ev) => {
      if (!visibleCalendarIds.has(ev.calendar_id)) return false;
      if (ev.deleted_at) return false;
      const evStart = new Date(ev.start_time).getTime();
      const evEnd = new Date(ev.end_time).getTime();
      return evStart < rangeEnd && evEnd > rangeStart;
    });
  }, [events, dates, visibleCalendarIds]);

  // Group events by date (an event can appear in multiple days if it spans)
  const dayGroups = useMemo(() => {
    const groups: DayGroup[] = [];

    for (const date of dates) {
      const dayStart = startOfDay(date).getTime();
      const dayEnd = endOfDay(date).getTime();

      const dayEvents = filteredEvents.filter((ev) => {
        const evStart = new Date(ev.start_time).getTime();
        const evEnd = new Date(ev.end_time).getTime();
        return evStart < dayEnd && evEnd > dayStart;
      });

      // Sort: all-day first, then by start time
      dayEvents.sort((a, b) => {
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });

      // Only include days that have events
      if (dayEvents.length > 0) {
        groups.push({ date, events: dayEvents });
      }
    }

    return groups;
  }, [dates, filteredEvents]);

  function getEventColor(ev: Event): string {
    if (ev.color) return ev.color;
    const cal = calendarMap.get(ev.calendar_id);
    return cal?.color ?? '#1a73e8';
  }

  function formatDateHeader(date: Date): string {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function getTimeText(ev: Event, date: Date): string {
    if (ev.is_all_day) return '全天';

    const evStart = new Date(ev.start_time);
    const evEnd = new Date(ev.end_time);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Multi-day event: show relevant portion for this day
    const isStartDay = isSameDay(evStart, date);
    const isEndDay = isSameDay(evEnd, date);

    if (isStartDay && isEndDay) {
      return `${formatTime(evStart)} - ${formatTime(evEnd)}`;
    } else if (isStartDay) {
      return `${formatTime(evStart)} - 次日`;
    } else if (isEndDay) {
      return `续 - ${formatTime(evEnd)}`;
    } else {
      return '全天';
    }
  }

  function renderEventRow(ev: Event, date: Date) {
    const color = getEventColor(ev);
    const timeText = getTimeText(ev, date);

    return (
      <div key={`${ev.id}-${date.getTime()}`} className={styles.eventRow}>
        <div className={styles.eventColorBar} style={{ backgroundColor: color }} />
        <div className={styles.eventContent}>
          <span className={styles.eventTitle}>{ev.title}</span>
          <span className={styles.eventTimeText}>{timeText}</span>
          {ev.location && (
            <span className={styles.eventLocation}>{ev.location}</span>
          )}
        </div>
      </div>
    );
  }

  function renderDateGroup(group: DayGroup) {
    const dayIsToday = isToday(group.date);
    const weekday = WEEKDAY_NAMES[group.date.getDay()];

    const headerClasses = [
      styles.dateHeader,
      dayIsToday ? styles.dateHeaderToday : '',
    ].filter(Boolean).join(' ');

    const dayClasses = [
      styles.dateHeaderDay,
      dayIsToday ? styles.dateHeaderDayToday : '',
    ].filter(Boolean).join(' ');

    const weekdayClasses = [
      styles.dateHeaderWeekday,
      dayIsToday ? styles.dateHeaderWeekdayToday : '',
    ].filter(Boolean).join(' ');

    return (
      <div key={group.date.getTime()} className={styles.dateGroup}>
        <div className={headerClasses}>
          <div className={dayClasses}>{group.date.getDate()}</div>
          <div className={styles.dateHeaderInfo}>
            <span className={weekdayClasses}>{weekday}</span>
            <span className={styles.dateHeaderFull}>
              {formatDateHeader(group.date)}
            </span>
          </div>
        </div>
        <div className={styles.eventList}>
          {group.events.map((ev) => renderEventRow(ev, group.date))}
        </div>
      </div>
    );
  }

  if (dayGroups.length === 0) {
    return (
      <div className={styles.agendaView}>
        <div className={styles.emptyState}>
          <span>未来 {AGENDA_DAYS} 天内无日程</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.agendaView}>
      {dayGroups.map((group) => renderDateGroup(group))}
    </div>
  );
}
