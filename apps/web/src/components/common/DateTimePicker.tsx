'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ScrollPickerColumn from './ScrollPickerColumn';
import styles from './DateTimePicker.module.css';

// Year range: current year -3 to +10
function buildYears() {
  const base = new Date().getFullYear();
  return Array.from({ length: 14 }, (_, i) => {
    const y = base - 3 + i;
    return { label: `${y}年`, value: y };
  });
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  label: `${i + 1}月`,
  value: i + 1,
}));

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  label: i.toString().padStart(2, '0'),
  value: i,
}));

const MINUTES = Array.from({ length: 12 }, (_, i) => ({
  label: (i * 5).toString().padStart(2, '0'),
  value: i * 5,
}));

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

interface DateTimePickerProps {
  /** Initial value */
  value: Date;
  /** Whether to show time columns */
  showTime?: boolean;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export default function DateTimePicker({
  value,
  showTime = true,
  onConfirm,
  onCancel,
}: DateTimePickerProps) {
  const YEARS = buildYears();

  const [year, setYear] = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth() + 1);
  const [day, setDay] = useState(value.getDate());
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(Math.round(value.getMinutes() / 5) * 5 % 60);

  // Recompute day list when year/month changes
  const maxDay = getDaysInMonth(year, month);
  const days = Array.from({ length: maxDay }, (_, i) => ({
    label: `${i + 1}日`,
    value: i + 1,
  }));

  // Clamp day to valid range
  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [day, maxDay]);

  const handleConfirm = useCallback(() => {
    const clampedDay = Math.min(day, maxDay);
    const m = showTime ? minute : 0;
    const h = showTime ? hour : 0;
    onConfirm(new Date(year, month - 1, clampedDay, h, m, 0, 0));
  }, [year, month, day, hour, minute, maxDay, showTime, onConfirm]);

  return (
    <div className={styles.panel}>
      <div className={styles.columns}>
        <ScrollPickerColumn items={YEARS} value={year} onChange={(v) => setYear(v as number)} />
        <ScrollPickerColumn items={MONTHS} value={month} onChange={(v) => setMonth(v as number)} />
        <ScrollPickerColumn items={days} value={Math.min(day, maxDay)} onChange={(v) => setDay(v as number)} />
        {showTime && (
          <>
            <div className={styles.divider} />
            <ScrollPickerColumn items={HOURS} value={hour} onChange={(v) => setHour(v as number)} />
            <div className={styles.colon}>:</div>
            <ScrollPickerColumn items={MINUTES} value={minute} onChange={(v) => setMinute(v as number)} />
          </>
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.cancelBtn} type="button" onClick={onCancel}>取消</button>
        <button className={styles.confirmBtn} type="button" onClick={handleConfirm}>确定</button>
      </div>
    </div>
  );
}
