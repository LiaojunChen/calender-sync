'use client';

import React, { useMemo } from 'react';
import { isSameDay, isToday } from '@project-calendar/shared';
import { useAppContext } from '@/contexts/AppContext';
import styles from './MiniCalendar.module.css';

const WEEK_DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
}

function getMonthGrid(year: number, month: number): DayCell[] {
  const cells: DayCell[] = [];
  const firstDay = new Date(year, month, 1);
  // Monday = 0, ..., Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  // Fill leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: d, isCurrentMonth: false });
  }

  // Current month days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }

  // Fill trailing days
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
  }

  return cells;
}

interface MiniCalendarProps {
  /** The month to display (year, month index) */
  displayYear?: number;
  displayMonth?: number;
  onChangeMonth?: (year: number, month: number) => void;
}

export default function MiniCalendar({
  displayYear,
  displayMonth,
  onChangeMonth,
}: MiniCalendarProps) {
  const { state, setDate } = useAppContext();

  const year = displayYear ?? state.currentDate.getFullYear();
  const month = displayMonth ?? state.currentDate.getMonth();

  const cells = useMemo(() => getMonthGrid(year, month), [year, month]);

  function handlePrev() {
    const prev = new Date(year, month - 1, 1);
    if (onChangeMonth) {
      onChangeMonth(prev.getFullYear(), prev.getMonth());
    } else {
      setDate(prev);
    }
  }

  function handleNext() {
    const next = new Date(year, month + 1, 1);
    if (onChangeMonth) {
      onChangeMonth(next.getFullYear(), next.getMonth());
    } else {
      setDate(next);
    }
  }

  function handleDayClick(date: Date) {
    setDate(date);
  }

  return (
    <div className={styles.miniCalendar}>
      <div className={styles.header}>
        <span className={styles.monthTitle}>
          {year}年{month + 1}月
        </span>
        <div className={styles.navButtons}>
          <button className={styles.navButton} onClick={handlePrev} title="上一月">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <button className={styles.navButton} onClick={handleNext} title="下一月">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.weekDays}>
        {WEEK_DAY_LABELS.map((label) => (
          <span key={label} className={styles.weekDay}>
            {label}
          </span>
        ))}
      </div>

      <div className={styles.daysGrid}>
        {cells.map((cell, i) => {
          const today = isToday(cell.date);
          const selected =
            !today && isSameDay(cell.date, state.currentDate);
          const classNames = [
            styles.day,
            !cell.isCurrentMonth ? styles.dayOtherMonth : '',
            today ? styles.dayToday : '',
            selected ? styles.daySelected : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={i}
              className={classNames}
              onClick={() => handleDayClick(cell.date)}
              title={`${cell.date.getFullYear()}-${cell.date.getMonth() + 1}-${cell.date.getDate()}`}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
