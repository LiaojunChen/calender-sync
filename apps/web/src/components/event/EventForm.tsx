'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import { toISODateString, formatTime } from '@project-calendar/shared';
import styles from './EventForm.module.css';

// ============================================================
// Constants
// ============================================================

const COLOR_PALETTE = [
  '#1a73e8',
  '#d50000',
  '#e67c73',
  '#f4511e',
  '#f6bf26',
  '#33b679',
  '#039be5',
  '#7986cb',
  '#8e24aa',
  '#616161',
  '#a79b8e',
  '#ad1457',
];

const REMINDER_OPTIONS: { label: string; value: number }[] = [
  { label: '5 分钟前', value: 5 },
  { label: '10 分钟前', value: 10 },
  { label: '15 分钟前', value: 15 },
  { label: '30 分钟前', value: 30 },
  { label: '1 小时前', value: 60 },
  { label: '1 天前', value: 1440 },
];

// ============================================================
// Types
// ============================================================

export interface EventFormData {
  title: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  calendarId: string;
  color: string | null;
  reminderOffsets: number[];
}

interface EventFormProps {
  /** Existing event to edit (null for create) */
  event?: Event | null;
  /** Pre-fill start/end times for create */
  defaultStart?: Date;
  defaultEnd?: Date;
  /** Default reminder offsets */
  defaultReminderOffsets?: number[];
  /** Available calendars */
  calendars: Calendar[];
  /** Called on save with form data and the event id if editing */
  onSave: (data: EventFormData, eventId?: string) => void;
  /** Called on cancel / close */
  onClose: () => void;
}

// ============================================================
// Helpers
// ============================================================

function dateToDateStr(d: Date): string {
  return toISODateString(d);
}

function dateToTimeStr(d: Date): string {
  return formatTime(d);
}

// ============================================================
// Component
// ============================================================

export default function EventForm({
  event,
  defaultStart,
  defaultEnd,
  defaultReminderOffsets,
  calendars,
  onSave,
  onClose,
}: EventFormProps) {
  const isEdit = !!event;
  const dialogRef = useRef<HTMLDivElement>(null);

  // Derive initial values
  const initStart = event ? new Date(event.start_time) : (defaultStart ?? new Date());
  const initEnd = event ? new Date(event.end_time) : (defaultEnd ?? new Date(initStart.getTime() + 60 * 60_000));

  const defaultCalId = event
    ? event.calendar_id
    : calendars.find((c) => c.is_default)?.id ?? calendars[0]?.id ?? '';

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [startDate, setStartDate] = useState(dateToDateStr(initStart));
  const [startTime, setStartTime] = useState(dateToTimeStr(initStart));
  const [endDate, setEndDate] = useState(dateToDateStr(initEnd));
  const [endTime, setEndTime] = useState(dateToTimeStr(initEnd));
  const [isAllDay, setIsAllDay] = useState(event?.is_all_day ?? false);
  const [calendarId, setCalendarId] = useState(defaultCalId);
  const [color, setColor] = useState<string | null>(event?.color ?? null);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(
    defaultReminderOffsets ?? [10, 1440],
  );

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  // Reminder management
  const addReminder = useCallback(() => {
    setReminderOffsets((prev) => [...prev, 10]);
  }, []);

  const removeReminder = useCallback((index: number) => {
    setReminderOffsets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateReminder = useCallback((index: number, value: number) => {
    setReminderOffsets((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  // Save handler
  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startDate,
        startTime,
        endDate,
        endTime,
        isAllDay,
        calendarId,
        color,
        reminderOffsets,
      },
      event?.id,
    );
  }, [
    title, description, location, startDate, startTime, endDate, endTime,
    isAllDay, calendarId, color, reminderOffsets, event, onSave,
  ]);

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayClick}>
      <div className={styles.dialog} ref={dialogRef}>
        {/* Title */}
        <input
          className={styles.titleInput}
          type="text"
          placeholder="标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        {/* All-day toggle */}
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={styles.toggleSwitch}
            data-checked={isAllDay}
            onClick={() => setIsAllDay(!isAllDay)}
          >
            <span className={styles.toggleKnob} />
          </button>
          <span className={styles.toggleLabel}>全天</span>
        </div>

        {/* Date/Time fields */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>开始</label>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            {!isAllDay && (
              <input
                className={styles.input}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>结束</label>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {!isAllDay && (
              <input
                className={styles.input}
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Location */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>地点</label>
          <input
            className={styles.input}
            type="text"
            placeholder="添加地点"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Description */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>描述</label>
          <textarea
            className={styles.textarea}
            placeholder="添加描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Calendar selector */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>所属日历</label>
          <select
            className={styles.select}
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
          >
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
        </div>

        {/* Color override */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>颜色</label>
          <div className={styles.colorPalette}>
            <button
              type="button"
              className={styles.colorDotNone}
              onClick={() => setColor(null)}
              title="默认颜色"
            >
              {color === null ? '\u2713' : ''}
            </button>
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.colorDot}${color === c ? ` ${styles.colorDotSelected}` : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Reminders */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>提醒</label>
          <div className={styles.reminderList}>
            {reminderOffsets.map((offset, idx) => (
              <div key={idx} className={styles.reminderRow}>
                <select
                  className={styles.reminderSelect}
                  value={offset}
                  onChange={(e) => updateReminder(idx, Number(e.target.value))}
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeReminder(idx)}
                  title="移除提醒"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={styles.addReminderBtn} onClick={addReminder}>
            + 添加提醒
          </button>
        </div>

        {/* Recurrence placeholder */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>重复</label>
          <span className={styles.recurrencePlaceholder}>暂不支持（待实现）</span>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!title.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
