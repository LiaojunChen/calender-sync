'use client';

import React, { useCallback } from 'react';
import type { Todo, Calendar } from '@project-calendar/shared';
import styles from './TodoItem.module.css';

interface TodoItemProps {
  todo: Todo;
  calendar: Calendar | undefined;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todoId: string) => void;
  isPinned?: boolean;
  onTogglePin?: (todoId: string) => void;
}

function formatDueTime(dueTime: string): string {
  // 'HH:MM:SS' or 'HH:MM' -> 'HH:MM'
  return dueTime.substring(0, 5);
}

export default function TodoItem({
  todo,
  calendar,
  onToggle,
  onEdit,
  onDelete,
  isPinned = false,
  onTogglePin,
}: TodoItemProps) {
  const calendarColor = todo.color ?? calendar?.color ?? '#1a73e8';

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(todo);
    },
    [todo, onToggle],
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(todo);
    },
    [todo, onEdit],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(todo.id);
    },
    [todo.id, onDelete],
  );

  const handlePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin?.(todo.id);
    },
    [todo.id, onTogglePin],
  );

  return (
    <div
      className={`${styles.todoItem} ${todo.is_completed ? styles.completed : ''} ${isPinned ? styles.pinned : ''}`}
      style={{ borderLeftColor: calendarColor }}
    >
      {/* Checkbox */}
      <button
        type="button"
        className={styles.checkbox}
        onClick={handleToggle}
        title={todo.is_completed ? '标记为未完成' : '标记为完成'}
        aria-label={todo.is_completed ? '标记为未完成' : '标记为完成'}
      >
        {todo.is_completed ? (
          <svg viewBox="0 0 18 18" width="18" height="18">
            <rect x="1" y="1" width="16" height="16" rx="2" fill={calendarColor} />
            <path d="M4 9l3.5 3.5L14 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        ) : (
          <svg viewBox="0 0 18 18" width="18" height="18">
            <rect x="1" y="1" width="16" height="16" rx="2" fill="none" stroke={calendarColor} strokeWidth="1.5" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className={styles.content} onClick={handleEdit}>
        <span className={styles.title}>{todo.title}</span>
        {(todo.due_date || todo.description) && (
          <div className={styles.meta}>
            {todo.due_date && (
              <span className={styles.dueDate}>
                截止：{todo.due_date}
                {todo.due_time ? ` ${formatDueTime(todo.due_time)}` : ' 全天'}
              </span>
            )}
            {todo.description && (
              <span className={styles.description}>{todo.description}</span>
            )}
          </div>
        )}
        {calendar && (
          <span className={styles.calendarBadge}>
            <span
              className={styles.calendarDot}
              style={{ backgroundColor: calendar.color }}
            />
            {calendar.name}
          </span>
        )}
      </div>

      {/* Actions (shown on hover) */}
      <div className={styles.actions}>
        {onTogglePin && (
          <button
            type="button"
            className={`${styles.actionBtn} ${isPinned ? styles.pinBtnActive : ''}`}
            onClick={handlePin}
            title={isPinned ? '取消置顶' : '置顶'}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
            </svg>
          </button>
        )}
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleEdit}
          title="编辑"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          onClick={handleDelete}
          title="删除"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
