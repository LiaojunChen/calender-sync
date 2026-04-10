'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { Calendar } from '@project-calendar/shared';
import { toISODateString, formatTime } from '@project-calendar/shared';
import {
  buildRruleString,
  describeRrule,
  type RecurrenceFrequency,
} from '@project-calendar/shared';
import DateTimePicker from '@/components/common/DateTimePicker';
import type { EventFormData } from '@/components/event/EventForm';
import type { TodoFormData } from '@/components/todo/TodoForm';
import styles from './CreateForm.module.css';

// ============================================================
// Constants
// ============================================================

const COLOR_PALETTE = [
  '#1a73e8', '#d50000', '#e67c73', '#f4511e', '#f6bf26',
  '#33b679', '#039be5', '#7986cb', '#8e24aa', '#616161',
];

const REMINDER_OPTIONS = [
  { label: '5 分钟前', value: 5 },
  { label: '10 分钟前', value: 10 },
  { label: '15 分钟前', value: 15 },
  { label: '30 分钟前', value: 30 },
  { label: '1 小时前', value: 60 },
  { label: '1 天前', value: 1440 },
];

const RECURRENCE_PRESETS = [
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
type ActiveTab = 'todo' | 'event';

// ============================================================
// Props
// ============================================================

interface CreateFormProps {
  defaultDate: Date;
  defaultTab?: ActiveTab;
  calendars: Calendar[];
  onSaveEvent: (data: EventFormData) => void;
  onSaveTodo: (data: TodoFormData) => void;
  onClose: () => void;
}

// ============================================================
// Sub-component: Custom Recurrence Form
// ============================================================

function CustomRecurrenceForm({
  onChange,
}: {
  onChange: (rrule: string) => void;
}) {
  const [freq, setFreq] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval] = useState(1);
  const [byweekday, setByweekday] = useState<number[]>([]);
  const [endType, setEndType] = useState<CustomEndType>('forever');
  const [count, setCount] = useState(10);
  const [until, setUntil] = useState('');

  useEffect(() => {
    const opts = {
      frequency: freq,
      interval: interval > 1 ? interval : undefined,
      byweekday: freq === 'weekly' && byweekday.length > 0 ? byweekday : undefined,
      count: endType === 'count' ? count : undefined,
      until: endType === 'until' && until ? new Date(until) : undefined,
    };
    try {
      onChange(buildRruleString(opts));
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
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

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
// Helpers
// ============================================================

function formatPickerDisplay(dateStr: string, timeStr: string, isAllDay: boolean): string {
  if (!dateStr) return '选择日期';
  const d = new Date(`${dateStr}T00:00:00`);
  const datePart = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  if (isAllDay || !timeStr) return datePart;
  return `${datePart} ${timeStr}`;
}

// ============================================================
// Main Component
// ============================================================

export default function CreateForm({
  defaultDate,
  defaultTab = 'todo',
  calendars,
  onSaveEvent,
  onSaveTodo,
  onClose,
}: CreateFormProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(defaultTab);

  const defaultCalId =
    calendars.find((c) => c.is_default)?.id ?? calendars[0]?.id ?? '';

  // ── Shared state ──────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [calendarId, setCalendarId] = useState(defaultCalId);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);

  // ── Todo state ────────────────────────────────────────────
  const [dueDate, setDueDate] = useState(toISODateString(defaultDate));
  const [dueTime, setDueTime] = useState(formatTime(defaultDate));
  const [todoPickerOpen, setTodoPickerOpen] = useState(false);

  // ── Event state ───────────────────────────────────────────
  const endDefault = new Date(defaultDate.getTime() + 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(toISODateString(defaultDate));
  const [startTime, setStartTime] = useState(formatTime(defaultDate));
  const [endDate, setEndDate] = useState(toISODateString(endDefault));
  const [endTime, setEndTime] = useState(formatTime(endDefault));
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const [rruleString, setRruleString] = useState<string | null>(null);
  const [recurrencePreset, setRecurrencePreset] = useState('none');
  const [customRrule, setCustomRrule] = useState<string | null>(null);

  // ── Tab switch (carry date across) ───────────────────────
  const handleTabSwitch = useCallback(
    (tab: ActiveTab) => {
      if (tab === activeTab) return;
      if (tab === 'event' && dueDate) {
        // Carry due date/time over to start/end
        setStartDate(dueDate);
        setEndDate(dueDate);
        if (dueTime) {
          setStartTime(dueTime);
          const h = Math.min(parseInt(dueTime.split(':')[0]) + 1, 23);
          setEndTime(`${h.toString().padStart(2, '0')}:${dueTime.split(':')[1]}`);
        }
      } else if (tab === 'todo' && startDate) {
        // Carry start date/time over to due
        setDueDate(startDate);
        setDueTime(startTime);
      }
      setActivePicker(null);
      setTodoPickerOpen(false);
      setActiveTab(tab);
    },
    [activeTab, dueDate, dueTime, startDate, startTime],
  );

  // ── Keyboard close ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Reminder helpers ──────────────────────────────────────
  const addReminder = useCallback(() => setReminderOffsets((p) => [...p, 10]), []);
  const removeReminder = useCallback(
    (i: number) => setReminderOffsets((p) => p.filter((_, idx) => idx !== i)),
    [],
  );
  const updateReminder = useCallback((i: number, v: number) => {
    setReminderOffsets((p) => { const n = [...p]; n[i] = v; return n; });
  }, []);

  // ── Recurrence helpers ────────────────────────────────────
  const handlePresetChange = useCallback(
    (preset: string) => {
      setRecurrencePreset(preset);
      if (preset === 'none') {
        setRruleString(null);
      } else if (preset === 'custom') {
        setRruleString(customRrule);
      } else {
        try {
          setRruleString(buildRruleString({ frequency: preset as RecurrenceFrequency }));
        } catch {
          setRruleString(null);
        }
      }
    },
    [customRrule],
  );

  const handleCustomChange = useCallback(
    (str: string) => {
      setCustomRrule(str);
      if (recurrencePreset === 'custom') setRruleString(str);
    },
    [recurrencePreset],
  );

  // ── Save ──────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    if (activeTab === 'todo') {
      onSaveTodo({ title: title.trim(), description: description.trim(), dueDate, dueTime, calendarId, reminderOffsets });
    } else {
      onSaveEvent({
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
      });
    }
  }, [
    activeTab, title, description, location,
    startDate, startTime, endDate, endTime, isAllDay,
    dueDate, dueTime,
    calendarId, color, reminderOffsets, rruleString,
    onSaveEvent, onSaveTodo,
  ]);

  // ── Icons ─────────────────────────────────────────────────
  const TodoIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="2.5" />
      <path d="M5 8l2 2 4-4" />
    </svg>
  );
  const EventIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M11 1.5v3M5 1.5v3M2 7h12" />
    </svg>
  );

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.dialog}>
        {/* Close button */}
        <div className={styles.dialogHeader}>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="关闭">
            &times;
          </button>
        </div>

        {/* Tab bar */}
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'todo' ? styles.tabActive : ''}`}
            onClick={() => handleTabSwitch('todo')}
          >
            {TodoIcon}
            待办
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'event' ? styles.tabActive : ''}`}
            onClick={() => handleTabSwitch('event')}
          >
            {EventIcon}
            日程
          </button>
        </div>

        {/* Form body */}
        <div className={styles.formBody}>
          {/* Shared: title */}
          <input
            className={styles.titleInput}
            type="text"
            placeholder={activeTab === 'todo' ? '待办标题' : '日程标题'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          {/* ── Todo fields ── */}
          {activeTab === 'todo' && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>描述</label>
                <textarea
                  className={styles.textarea}
                  placeholder="添加描述（可选）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>截止日期</label>
                <button
                  type="button"
                  className={styles.dateBtn}
                  onClick={() => setTodoPickerOpen(!todoPickerOpen)}
                >
                  {dueDate
                    ? `${new Date(dueDate + 'T00:00:00').getFullYear()}年${new Date(dueDate + 'T00:00:00').getMonth() + 1}月${new Date(dueDate + 'T00:00:00').getDate()}日${dueTime ? ' ' + dueTime : ''}`
                    : '选择截止日期（可选）'}
                </button>
                {todoPickerOpen && (
                  <DateTimePicker
                    value={dueDate ? new Date(`${dueDate}T${dueTime || '09:00'}:00`) : defaultDate}
                    showTime
                    onConfirm={(d) => {
                      setDueDate(d.toISOString().substring(0, 10));
                      setDueTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
                      setTodoPickerOpen(false);
                    }}
                    onCancel={() => setTodoPickerOpen(false)}
                  />
                )}
              </div>
            </>
          )}

          {/* ── Event fields ── */}
          {activeTab === 'event' && (
            <>
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

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>开始</label>
                <button
                  type="button"
                  className={styles.dateBtn}
                  onClick={() => setActivePicker(activePicker === 'start' ? null : 'start')}
                >
                  {formatPickerDisplay(startDate, startTime, isAllDay)}
                </button>
                {activePicker === 'start' && (
                  <DateTimePicker
                    value={(() => { try { return new Date(`${startDate}T${startTime || '09:00'}:00`); } catch { return new Date(); } })()}
                    showTime={!isAllDay}
                    onConfirm={(d) => {
                      setStartDate(toISODateString(d));
                      setStartTime(formatTime(d));
                      setActivePicker(null);
                    }}
                    onCancel={() => setActivePicker(null)}
                  />
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>结束</label>
                <button
                  type="button"
                  className={styles.dateBtn}
                  onClick={() => setActivePicker(activePicker === 'end' ? null : 'end')}
                >
                  {formatPickerDisplay(endDate, endTime, isAllDay)}
                </button>
                {activePicker === 'end' && (
                  <DateTimePicker
                    value={(() => { try { return new Date(`${endDate}T${endTime || '10:00'}:00`); } catch { return new Date(); } })()}
                    showTime={!isAllDay}
                    onConfirm={(d) => {
                      setEndDate(toISODateString(d));
                      setEndTime(formatTime(d));
                      setActivePicker(null);
                    }}
                    onCancel={() => setActivePicker(null)}
                  />
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>地点</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="添加地点"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>描述</label>
                <textarea
                  className={styles.textarea}
                  placeholder="添加描述"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Shared: calendar selector ── */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>所属日历</label>
            {activeTab === 'todo' ? (
              <div className={styles.calendarSelectRow}>
                {calendars.map((cal) => (
                  <div
                    key={cal.id}
                    className={`${styles.calendarOption} ${calendarId === cal.id ? styles.calendarOptionSelected : ''}`}
                    onClick={() => setCalendarId(cal.id)}
                  >
                    <span className={styles.calendarDot} style={{ backgroundColor: cal.color }} />
                    <span>{cal.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <select
                className={styles.select}
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
              >
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>{cal.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* ── Event only: color ── */}
          {activeTab === 'event' && (
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
          )}

          {/* ── Shared: reminders ── */}
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
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button type="button" className={styles.removeBtn} onClick={() => removeReminder(idx)} title="移除">
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className={styles.addReminderBtn} onClick={addReminder}>
              + 添加提醒
            </button>
          </div>

          {/* ── Event only: recurrence ── */}
          {activeTab === 'event' && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>重复</label>
              <select
                className={styles.select}
                value={recurrencePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                {RECURRENCE_PRESETS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {rruleString && recurrencePreset !== 'custom' && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {describeRrule(rruleString)}
                </div>
              )}
              {recurrencePreset === 'custom' && (
                <CustomRecurrenceForm onChange={handleCustomChange} />
              )}
            </div>
          )}

          {/* ── Actions ── */}
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
    </div>
  );
}
