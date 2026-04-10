'use client';

import React, { useState, useCallback } from 'react';
import type { UserSettings } from '@project-calendar/shared';
import { updateUserSettings } from '@project-calendar/shared';
import { useAppContext, type ViewType, type ThemeMode, DEFAULT_USER_SETTINGS } from '@/contexts/AppContext';
import { getSupabaseClient } from '@/lib/supabase';
import styles from './SettingsPanel.module.css';

// ============================================================
// Constants
// ============================================================

const REMINDER_OPTIONS: { label: string; value: number }[] = [
  { label: '5 分钟前', value: 5 },
  { label: '10 分钟前', value: 10 },
  { label: '15 分钟前', value: 15 },
  { label: '30 分钟前', value: 30 },
  { label: '1 小时前', value: 60 },
  { label: '2 小时前', value: 120 },
  { label: '1 天前', value: 1440 },
  { label: '2 天前', value: 2880 },
];

const VIEW_OPTIONS: { label: string; value: ViewType }[] = [
  { label: '日视图', value: 'day' },
  { label: '周视图', value: 'week' },
  { label: '月视图', value: 'month' },
  { label: '议程', value: 'agenda' },
];

const WEEK_START_OPTIONS: { label: string; value: 'monday' | 'sunday' }[] = [
  { label: '星期一', value: 'monday' },
  { label: '星期日', value: 'sunday' },
];

const DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: '15 分钟', value: 15 },
  { label: '30 分钟', value: 30 },
  { label: '45 分钟', value: 45 },
  { label: '60 分钟', value: 60 },
  { label: '90 分钟', value: 90 },
  { label: '120 分钟', value: 120 },
];

const THEME_OPTIONS: { label: string; value: 'light' | 'dark' | 'system' }[] = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
];

function formatReminderLabel(minutes: number): string {
  const found = REMINDER_OPTIONS.find((o) => o.value === minutes);
  if (found) return found.label;
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes % 1440 === 0) return `${minutes / 1440} 天前`;
  if (minutes % 60 === 0) return `${minutes / 60} 小时前`;
  return `${minutes} 分钟前`;
}

// ============================================================
// Component
// ============================================================

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { state, dispatch, setTheme } = useAppContext();

  const currentSettings = state.userSettings;
  const defaults = DEFAULT_USER_SETTINGS;

  // Local form state
  const [defaultView, setDefaultView] = useState<ViewType>(
    (currentSettings?.default_view as ViewType) ?? defaults.default_view
  );
  const [weekStartDay, setWeekStartDay] = useState<'monday' | 'sunday'>(
    currentSettings?.week_start_day ?? defaults.week_start_day
  );
  const [defaultEventDuration, setDefaultEventDuration] = useState<number>(
    currentSettings?.default_event_duration ?? defaults.default_event_duration
  );
  const [theme, setLocalTheme] = useState<'light' | 'dark' | 'system'>(
    currentSettings?.theme ?? defaults.theme
  );
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(
    currentSettings?.default_reminder_offsets ?? defaults.default_reminder_offsets
  );
  const [newReminderValue, setNewReminderValue] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const handleAddReminder = useCallback(() => {
    if (!reminderOffsets.includes(newReminderValue)) {
      setReminderOffsets((prev) => [...prev, newReminderValue].sort((a, b) => a - b));
    }
  }, [reminderOffsets, newReminderValue]);

  const handleRemoveReminder = useCallback((val: number) => {
    setReminderOffsets((prev) => prev.filter((v) => v !== val));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSavedMessage('');

    const updates: Omit<UserSettings, 'id' | 'user_id' | 'updated_at'> = {
      default_view: defaultView,
      week_start_day: weekStartDay,
      default_event_duration: defaultEventDuration,
      theme,
      default_reminder_offsets: reminderOffsets,
    };

    // Apply theme immediately
    setTheme(theme as ThemeMode);

    if (state.isAuthenticated) {
      const client = getSupabaseClient();
      if (client) {
        const result = await updateUserSettings(client, updates);
        if (result.data) {
          dispatch({
            type: 'SET_USER_SETTINGS',
            userSettings: result.data as unknown as UserSettings,
          });
        }
      }
    } else {
      // Demo mode: update in context with a mock settings object
      const mockSettings: UserSettings = {
        id: 'demo-settings',
        user_id: 'demo',
        updated_at: new Date().toISOString(),
        ...updates,
      };
      dispatch({ type: 'SET_USER_SETTINGS', userSettings: mockSettings });
    }

    setSaving(false);
    setSavedMessage('已保存');
    setTimeout(() => setSavedMessage(''), 2000);
  }, [defaultView, weekStartDay, defaultEventDuration, theme, reminderOffsets, state.isAuthenticated, dispatch, setTheme]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>设置</h2>
          <button className={styles.closeBtn} onClick={onClose} title="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {/* Default view */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>默认视图</div>
            <div className={styles.radioGroup}>
              {VIEW_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="defaultView"
                    value={opt.value}
                    checked={defaultView === opt.value}
                    onChange={() => setDefaultView(opt.value)}
                    className={styles.radioInput}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Week start day */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>周起始日</div>
            <div className={styles.radioGroup}>
              {WEEK_START_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="weekStartDay"
                    value={opt.value}
                    checked={weekStartDay === opt.value}
                    onChange={() => setWeekStartDay(opt.value)}
                    className={styles.radioInput}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Default event duration */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>默认时长</div>
            <select
              className={styles.select}
              value={defaultEventDuration}
              onChange={(e) => setDefaultEventDuration(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Default reminders */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>默认提醒</div>
            <div className={styles.reminderList}>
              {reminderOffsets.map((val) => (
                <div key={val} className={styles.reminderItem}>
                  <span>{formatReminderLabel(val)}</span>
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemoveReminder(val)}
                    title="移除提醒"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className={styles.addReminderRow}>
                <select
                  className={styles.select}
                  value={newReminderValue}
                  onChange={(e) => setNewReminderValue(Number(e.target.value))}
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button className={styles.addBtn} onClick={handleAddReminder}>
                  添加
                </button>
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>主题</div>
            <div className={styles.radioGroup}>
              {THEME_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="theme"
                    value={opt.value}
                    checked={theme === opt.value}
                    onChange={() => setLocalTheme(opt.value)}
                    className={styles.radioInput}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          {savedMessage && <span className={styles.savedMsg}>{savedMessage}</span>}
          <button className={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
