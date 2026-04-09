'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import { toISODateString, formatTime } from '@project-calendar/shared';
import {
  buildRruleString,
  describeRrule,
  type RecurrenceFrequency,
} from '@project-calendar/shared';
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

const RECURRENCE_PRESET_OPTIONS: { label: string; value: string }[] = [
  { label: '不重复', value: 'none' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: '每年', value: 'yearly' },
  { label: '每工作日', value: 'weekdays' },
  { label: '自定义', value: 'custom' },
];

const CUSTOM_FREQ_OPTIONS: { label: string; value: RecurrenceFrequency }[] = [
  { label: '天', value: 'daily' },
  { label: '周', value: 'weekly' },
  { label: '月', value: 'monthly' },
  { label: '年', value: 'yearly' },
];

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

type CustomEndType = 'forever' | 'count' | 'until';

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
  /** RRULE string (e.g. "FREQ=DAILY") or null for no recurrence */
  rruleString: string | null;
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

/** Detect preset from rrule string */
function detectPreset(rrule: string | null): string {
  if (!rrule) return 'none';
  const upper = rrule.toUpperCase();
  if (upper.includes('FREQ=DAILY') && upper.includes('BYDAY=MO,TU,WE,TH,FR'))
    return 'weekdays';
  if (upper.includes('FREQ=DAILY') && !upper.includes('BYDAY')) return 'daily';
  if (upper.includes('FREQ=WEEKLY') && !upper.includes('BYDAY')) return 'weekly';
  if (upper.includes('FREQ=MONTHLY')) return 'monthly';
  if (upper.includes('FREQ=YEARLY')) return 'yearly';
  // Has extra customisation
  return 'custom';
}

// ============================================================
// Sub-component: Custom Recurrence Form
// ============================================================

interface CustomFormProps {
  onChange: (rrule: string) => void;
  initial?: string | null;
}

function CustomRecurrenceForm({ onChange, initial }: CustomFormProps) {
  const [freq, setFreq] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval] = useState(1);
  const [byweekday, setByweekday] = useState<number[]>([]);
  const [endType, setEndType] = useState<CustomEndType>('forever');
  const [count, setCount] = useState(10);
  const [until, setUntil] = useState('');

  // Parse initial rrule string if provided
  useEffect(() => {
    if (!initial) return;
    // Simple parse for preset re-entry — full parse not needed
    const upper = initial.toUpperCase();
    if (upper.includes('FREQ=WEEKLY')) setFreq('weekly');
    else if (upper.includes('FREQ=MONTHLY')) setFreq('monthly');
    else if (upper.includes('FREQ=YEARLY')) setFreq('yearly');
    else setFreq('daily');

    const intMatch = upper.match(/INTERVAL=(\d+)/);
    if (intMatch) setInterval(parseInt(intMatch[1], 10));

    if (upper.includes('COUNT=')) {
      const m = upper.match(/COUNT=(\d+)/);
      if (m) {
        setCount(parseInt(m[1], 10));
        setEndType('count');
      }
    } else if (upper.includes('UNTIL=')) {
      setEndType('until');
    }
  }, [initial]);

  // Build and emit rrule whenever options change
  useEffect(() => {
    const opts = {
      frequency: freq,
      interval: interval > 1 ? interval : undefined,
      byweekday: freq === 'weekly' && byweekday.length > 0 ? byweekday : undefined,
      count: endType === 'count' ? count : undefined,
      until: endType === 'until' && until ? new Date(until) : undefined,
    };
    try {
      const str = buildRruleString(opts);
      onChange(str);
    } catch {
      // ignore invalid states during typing
    }
  }, [freq, interval, byweekday, endType, count, until, onChange]);

  const toggleWeekday = (day: number) => {
    setByweekday((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  return (
    <div className={styles.recurrenceCustomForm}>
      {/* Frequency + interval */}
      <div className={styles.recurrenceCustomRow}>
        <span className={styles.recurrenceCustomLabel}>每</span>
        <input
          className={styles.recurrenceIntervalInput}
          type="number"
          min={1}
          max={99}
          value={interval}
          onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
        />
        <select
          className={styles.select}
          value={freq}
          onChange={(e) => setFreq(e.target.value as RecurrenceFrequency)}
          style={{ flex: 'none', width: 'auto' }}
        >
          {CUSTOM_FREQ_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Weekday picker (only for weekly) */}
      {freq === 'weekly' && (
        <div className={styles.recurrenceCustomRow}>
          <span className={styles.recurrenceCustomLabel}>周</span>
          <div className={styles.recurrenceWeekdayList}>
            {WEEKDAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                className={styles.recurrenceWeekdayBtn}
                data-selected={byweekday.includes(idx) ? 'true' : 'false'}
                onClick={() => toggleWeekday(idx)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* End condition */}
      <div className={styles.recurrenceCustomRow}>
        <span className={styles.recurrenceCustomLabel}>结束</span>
        <select
          className={styles.select}
          value={endType}
          onChange={(e) => setEndType(e.target.value as CustomEndType)}
          style={{ flex: 'none', width: 'auto' }}
        >
          <option value="forever">永不</option>
          <option value="count">次数</option>
          <option value="until">日期</option>
        </select>

        {endType === 'count' && (
          <>
            <input
              className={styles.recurrenceIntervalInput}
              type="number"
              min={1}
              max={999}
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>次</span>
          </>
        )}

        {endType === 'until' && (
          <input
            className={styles.input}
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            style={{ flex: 'none', width: 'auto' }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
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

  // Recurrence state
  // We store the current rrule string (null = no recurrence)
  // and separately track which preset is selected
  const [rruleString, setRruleString] = useState<string | null>(null);
  const [recurrencePreset, setRecurrencePreset] = useState<string>('none');
  const [customRrule, setCustomRrule] = useState<string | null>(null);

  // If editing an event with existing recurrence, detect the preset
  useEffect(() => {
    // In a real implementation we'd load the rrule from the event's recurrence_rule_id.
    // For demo mode events that already have rrule strings embedded, we skip.
    // The form starts with no recurrence selected.
  }, []);

  // Handle preset change
  const handlePresetChange = useCallback((preset: string) => {
    setRecurrencePreset(preset);
    if (preset === 'none') {
      setRruleString(null);
    } else if (preset === 'custom') {
      setRruleString(customRrule);
    } else {
      try {
        const str = buildRruleString({ frequency: preset as RecurrenceFrequency });
        setRruleString(str);
      } catch {
        setRruleString(null);
      }
    }
  }, [customRrule]);

  // Handle custom form change
  const handleCustomChange = useCallback((str: string) => {
    setCustomRrule(str);
    if (recurrencePreset === 'custom') {
      setRruleString(str);
    }
  }, [recurrencePreset]);

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
        rruleString,
      },
      event?.id,
    );
  }, [
    title, description, location, startDate, startTime, endDate, endTime,
    isAllDay, calendarId, color, reminderOffsets, rruleString, event, onSave,
  ]);

  // Human-readable recurrence label for confirmation display
  const recurrenceLabel =
    rruleString ? describeRrule(rruleString) : '不重复';

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

        {/* Recurrence selector */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>重复</label>
          <select
            className={styles.select}
            value={recurrencePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {RECURRENCE_PRESET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Show description of selected recurrence */}
          {rruleString && recurrencePreset !== 'custom' && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {recurrenceLabel}
            </div>
          )}

          {/* Custom sub-form */}
          {recurrencePreset === 'custom' && (
            <CustomRecurrenceForm
              onChange={handleCustomChange}
              initial={null}
            />
          )}
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
