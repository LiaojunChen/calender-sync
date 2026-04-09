'use client';

import React, { useState, useCallback } from 'react';
import type { Calendar } from '@project-calendar/shared';
import { useAppContext } from '@/contexts/AppContext';
import { getSupabaseClient } from '@/lib/supabase';
import {
  createCalendar,
  updateCalendar,
  deleteCalendar as apiDeleteCalendar,
} from '@project-calendar/shared';
import styles from './CalendarList.module.css';

// ============================================================
// Color palette (Google Calendar style)
// ============================================================

const CALENDAR_COLORS = [
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

// ============================================================
// Sub-components: Modals
// ============================================================

interface CalendarFormModalProps {
  title: string;
  initialName?: string;
  initialColor?: string;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}

function CalendarFormModal({
  title,
  initialName = '',
  initialColor = CALENDAR_COLORS[0],
  onSave,
  onCancel,
}: CalendarFormModalProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{title}</h2>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>日历名称</label>
          <input
            className={styles.formInput}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入日历名称"
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>颜色</label>
          <div className={styles.colorPicker}>
            {CALENDAR_COLORS.map((c) => (
              <button
                key={c}
                className={`${styles.colorSwatch} ${c === color ? styles.colorSwatchSelected : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.buttonCancel} onClick={onCancel}>
            取消
          </button>
          <button
            className={styles.buttonPrimary}
            disabled={!name.trim()}
            onClick={() => onSave(name.trim(), color)}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  calendarName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ calendarName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>删除日历</h2>
        <p className={styles.confirmText}>
          确定要删除日历 &ldquo;{calendarName}&rdquo; 吗？
          <br />
          该日历下的事件和待办将移至默认日历。
        </p>
        <div className={styles.modalActions}>
          <button className={styles.buttonCancel} onClick={onCancel}>
            取消
          </button>
          <button className={styles.buttonDanger} onClick={onConfirm}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main CalendarList Component
// ============================================================

export default function CalendarList() {
  const { state, dispatch } = useAppContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [deletingCalendar, setDeletingCalendar] = useState<Calendar | null>(null);

  const client = getSupabaseClient();

  // Toggle visibility
  const handleToggleVisibility = useCallback(
    async (cal: Calendar) => {
      dispatch({ type: 'TOGGLE_CALENDAR_VISIBILITY', id: cal.id });

      if (client) {
        try {
          await updateCalendar(client, cal.id, { is_visible: !cal.is_visible });
        } catch {
          // Revert on error
          dispatch({ type: 'TOGGLE_CALENDAR_VISIBILITY', id: cal.id });
        }
      }
    },
    [client, dispatch]
  );

  // Create calendar
  const handleCreate = useCallback(
    async (name: string, color: string) => {
      setShowCreateModal(false);

      if (client && state.userId) {
        try {
          const result = await createCalendar(client, {
            user_id: state.userId,
            name,
            color,
          });
          if (result.data) {
            dispatch({ type: 'ADD_CALENDAR', calendar: result.data as unknown as Calendar });
          }
        } catch (err) {
          console.error('Failed to create calendar:', err);
        }
      } else {
        // Mock / offline mode - create a local calendar
        const mockCalendar: Calendar = {
          id: `local-${Date.now()}`,
          user_id: state.userId || 'local',
          name,
          color,
          is_visible: true,
          is_default: false,
          sort_order: state.calendars.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_CALENDAR', calendar: mockCalendar });
      }
    },
    [client, state.userId, state.calendars.length, dispatch]
  );

  // Edit calendar
  const handleEdit = useCallback(
    async (name: string, color: string) => {
      if (!editingCalendar) return;
      const updated: Calendar = { ...editingCalendar, name, color, updated_at: new Date().toISOString() };
      setEditingCalendar(null);

      dispatch({ type: 'UPDATE_CALENDAR', calendar: updated });

      if (client) {
        try {
          await updateCalendar(client, editingCalendar.id, { name, color });
        } catch (err) {
          console.error('Failed to update calendar:', err);
          // Revert
          dispatch({ type: 'UPDATE_CALENDAR', calendar: editingCalendar });
        }
      }
    },
    [client, editingCalendar, dispatch]
  );

  // Delete calendar
  const handleDelete = useCallback(async () => {
    if (!deletingCalendar) return;
    const id = deletingCalendar.id;
    setDeletingCalendar(null);

    dispatch({ type: 'REMOVE_CALENDAR', id });

    if (client) {
      try {
        await apiDeleteCalendar(client, id);
      } catch (err) {
        console.error('Failed to delete calendar:', err);
        // Revert
        dispatch({ type: 'ADD_CALENDAR', calendar: deletingCalendar });
      }
    }
  }, [client, deletingCalendar, dispatch]);

  return (
    <div className={styles.calendarList}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>我的日历</span>
        <button
          className={styles.addButton}
          onClick={() => setShowCreateModal(true)}
          title="添加日历"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      </div>

      {state.calendars.map((cal) => (
        <div key={cal.id} className={styles.calendarItem}>
          {/* Checkbox */}
          <div
            className={`${styles.checkbox} ${cal.is_visible ? styles.checkboxChecked : ''}`}
            style={{
              borderColor: cal.color,
              backgroundColor: cal.is_visible ? cal.color : 'transparent',
            }}
            onClick={() => handleToggleVisibility(cal)}
          >
            {cal.is_visible && (
              <span className={styles.checkmark}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </span>
            )}
          </div>

          {/* Name */}
          <span className={styles.calendarName}>
            {cal.name}
            {cal.is_default && <span className={styles.defaultBadge}>默认</span>}
          </span>

          {/* Actions (edit / delete) */}
          <div className={styles.calendarActions}>
            <button
              className={styles.calendarActionButton}
              onClick={() => setEditingCalendar(cal)}
              title="编辑日历"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </button>
            {!cal.is_default && (
              <button
                className={styles.calendarActionButton}
                onClick={() => setDeletingCalendar(cal)}
                title="删除日历"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}

      {state.calendars.length === 0 && (
        <div style={{ padding: '8px 16px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          暂无日历，请点击 + 创建
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CalendarFormModal
          title="创建日历"
          onSave={handleCreate}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editingCalendar && (
        <CalendarFormModal
          title="编辑日历"
          initialName={editingCalendar.name}
          initialColor={editingCalendar.color}
          onSave={handleEdit}
          onCancel={() => setEditingCalendar(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deletingCalendar && (
        <DeleteConfirmModal
          calendarName={deletingCalendar.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingCalendar(null)}
        />
      )}
    </div>
  );
}
