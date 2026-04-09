'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { Todo, Calendar } from '@project-calendar/shared';
import { toISODateString } from '@project-calendar/shared';
import styles from './TodoForm.module.css';

// ============================================================
// Constants
// ============================================================

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

export interface TodoFormData {
  title: string;
  description: string;
  dueDate: string;   // YYYY-MM-DD or ''
  dueTime: string;   // HH:mm or ''
  calendarId: string;
  reminderOffsets: number[];
}

interface TodoFormProps {
  /** Existing todo to edit (null for create) */
  todo?: Todo | null;
  /** Pre-fill due date */
  defaultDate?: Date;
  /** Available calendars */
  calendars: Calendar[];
  /** Called on save */
  onSave: (data: TodoFormData, todoId?: string) => void;
  /** Called on cancel / close */
  onClose: () => void;
}

// ============================================================
// Component
// ============================================================

export default function TodoForm({
  todo,
  defaultDate,
  calendars,
  onSave,
  onClose,
}: TodoFormProps) {
  const isEdit = !!todo;

  const defaultCalId = todo
    ? todo.calendar_id
    : calendars.find((c) => c.is_default)?.id ?? calendars[0]?.id ?? '';

  const initDueDate = todo?.due_date ?? (defaultDate ? toISODateString(defaultDate) : '');
  const initDueTime = todo?.due_time
    ? todo.due_time.substring(0, 5) // 'HH:MM:SS' -> 'HH:MM'
    : '';

  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [dueDate, setDueDate] = useState(initDueDate);
  const [dueTime, setDueTime] = useState(initDueTime);
  const [calendarId, setCalendarId] = useState(defaultCalId);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);

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
        dueDate,
        dueTime,
        calendarId,
        reminderOffsets,
      },
      todo?.id,
    );
  }, [title, description, dueDate, dueTime, calendarId, reminderOffsets, todo, onSave]);

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayClick}>
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.dialogHeader}>
          <h2 className={styles.dialogTitle}>
            {isEdit ? '编辑待办' : '新建待办'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="关闭">
            &times;
          </button>
        </div>

        {/* Title */}
        <input
          className={styles.titleInput}
          type="text"
          placeholder="待办标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        {/* Description */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>描述</label>
          <textarea
            className={styles.textarea}
            placeholder="添加描述（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Due date */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>截止日期</label>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <input
              className={styles.input}
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        </div>

        {/* Calendar selector */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>所属日历</label>
          <div className={styles.calendarSelectRow}>
            {calendars.map((cal) => (
              <div
                key={cal.id}
                className={`${styles.calendarOption} ${calendarId === cal.id ? styles.calendarOptionSelected : ''}`}
                onClick={() => setCalendarId(cal.id)}
              >
                <span
                  className={styles.calendarDot}
                  style={{ backgroundColor: cal.color }}
                />
                <span className={styles.calendarName}>{cal.name}</span>
              </div>
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
