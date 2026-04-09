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

  return (
    <div
      className={`${styles.todoItem} ${todo.is_completed ? styles.completed : ''}`}
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
