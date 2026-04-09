'use client';

import React, { useMemo, useState, useCallback } from 'react';
import type { Todo, Calendar } from '@project-calendar/shared';
import { toISODateString } from '@project-calendar/shared';
import TodoItem from './TodoItem';
import styles from './TodoList.module.css';

// ============================================================
// Types
// ============================================================

type FilterType = 'all' | 'today' | 'upcoming';

interface TodoListProps {
  todos: Todo[];
  calendars: Calendar[];
  onNewTodo: () => void;
  onEditTodo: (todo: Todo) => void;
  onToggleTodo: (todo: Todo) => void;
  onDeleteTodo: (todoId: string) => void;
  onClose: () => void;
}

// ============================================================
// Helpers
// ============================================================

function getTodayStr(): string {
  return toISODateString(new Date());
}

// ============================================================
// Component
// ============================================================

export default function TodoList({
  todos,
  calendars,
  onNewTodo,
  onEditTodo,
  onToggleTodo,
  onDeleteTodo,
  onClose,
}: TodoListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const calendarMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    for (const c of calendars) map.set(c.id, c);
    return map;
  }, [calendars]);

  const today = getTodayStr();

  // Apply filter
  const filteredTodos = useMemo(() => {
    let list = todos.filter((t) => !t.deleted_at);

    switch (filter) {
      case 'today':
        list = list.filter((t) => t.due_date === today);
        break;
      case 'upcoming':
        list = list.filter((t) => t.due_date && t.due_date > today);
        break;
      default:
        break;
    }

    return list;
  }, [todos, filter, today]);

  const incompleteTodos = useMemo(
    () => filteredTodos.filter((t) => !t.is_completed),
    [filteredTodos],
  );

  const completedTodos = useMemo(
    () => filteredTodos.filter((t) => t.is_completed),
    [filteredTodos],
  );

  // Sort: by due_date asc, then no-date at end
  const sortedIncomplete = useMemo(() => {
    return [...incompleteTodos].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
      if (!a.due_time && !b.due_time) return 0;
      if (!a.due_time) return 1;
      if (!b.due_time) return -1;
      return a.due_time.localeCompare(b.due_time);
    });
  }, [incompleteTodos]);

  const sortedCompleted = useMemo(() => {
    return [...completedTodos].sort((a, b) => {
      const ca = a.completed_at ?? '';
      const cb = b.completed_at ?? '';
      return cb.localeCompare(ca); // most recently completed first
    });
  }, [completedTodos]);

  return (
    <div className={styles.panel}>
      {/* Panel header */}
      <div className={styles.header}>
        <h2 className={styles.title}>待办事项</h2>
        <button type="button" className={styles.closeBtn} onClick={onClose} title="关闭面板">
          &times;
        </button>
      </div>

      {/* New todo button */}
      <button type="button" className={styles.newBtn} onClick={onNewTodo}>
        <span className={styles.newBtnPlus}>+</span>
        新建待办
      </button>

      {/* Filter tabs */}
      <div className={styles.filterTabs}>
        {(['all', 'today', 'upcoming'] as FilterType[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部' : f === 'today' ? '今天' : '即将到来'}
          </button>
        ))}
      </div>

      {/* Incomplete todos */}
      <div className={styles.list}>
        {sortedIncomplete.length === 0 && completedTodos.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>☑</span>
            <span>暂无待办事项</span>
            <button
              type="button"
              className={styles.emptyNewBtn}
              onClick={onNewTodo}
            >
              新建待办
            </button>
          </div>
        ) : (
          sortedIncomplete.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              calendar={calendarMap.get(todo.calendar_id)}
              onToggle={onToggleTodo}
              onEdit={onEditTodo}
              onDelete={onDeleteTodo}
            />
          ))
        )}
      </div>

      {/* Completed section */}
      {completedTodos.length > 0 && (
        <div className={styles.completedSection}>
          <button
            type="button"
            className={styles.completedToggle}
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <span className={`${styles.completedArrow} ${showCompleted ? styles.completedArrowOpen : ''}`}>
              ▶
            </span>
            已完成（{completedTodos.length}）
          </button>
          {showCompleted && (
            <div className={styles.list}>
              {sortedCompleted.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  calendar={calendarMap.get(todo.calendar_id)}
                  onToggle={onToggleTodo}
                  onEdit={onEditTodo}
                  onDelete={onDeleteTodo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
