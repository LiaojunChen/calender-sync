'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { Todo, Calendar } from '@project-calendar/shared';
import {
  filterTodosByDateBucket,
  toISODateString,
  type TodoFilterType,
} from '@project-calendar/shared';
import TodoItem from './TodoItem';
import styles from './TodoList.module.css';

interface TodoListProps {
  todos: Todo[];
  calendars: Calendar[];
  onQuickCreateTodo: (title: string) => Promise<boolean> | boolean;
  onEditTodo: (todo: Todo) => void;
  onToggleTodo: (todo: Todo) => void;
  onDeleteTodo: (todoId: string) => void;
  onClose: () => void;
}

// ============================================================
// Helpers
// ============================================================

const PINNED_STORAGE_KEY = 'project-calendar:pinned-todos';

function loadPinnedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function savePinnedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage errors
  }
}

function getTodayStr(): string {
  return toISODateString(new Date());
}

// ============================================================
// Component
// ============================================================

export default function TodoList({
  todos,
  calendars,
  onQuickCreateTodo,
  onEditTodo,
  onToggleTodo,
  onDeleteTodo,
  onClose,
}: TodoListProps) {
  const [filter, setFilter] = useState<TodoFilterType>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(loadPinnedIds);
  const [quickCreateTitle, setQuickCreateTitle] = useState('');
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const quickCreateInputRef = useRef<HTMLInputElement>(null);

  // Keep localStorage in sync whenever pinnedIds changes
  useEffect(() => {
    savePinnedIds(pinnedIds);
  }, [pinnedIds]);

  const handleTogglePin = useCallback((todoId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  }, []);

  const calendarMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    for (const c of calendars) map.set(c.id, c);
    return map;
  }, [calendars]);

  const today = getTodayStr();

  const filteredTodos = useMemo(() => {
    return filterTodosByDateBucket(todos, filter, today);
  }, [todos, filter, today]);

  const incompleteTodos = useMemo(
    () => filteredTodos.filter((t) => !t.is_completed),
    [filteredTodos],
  );

  const completedTodos = useMemo(
    () => filteredTodos.filter((t) => t.is_completed),
    [filteredTodos],
  );

  // Sort: pinned first, then by due_date asc, no-date at end
  const sortedIncomplete = useMemo(() => {
    return [...incompleteTodos].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;

      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
      if (!a.due_time && !b.due_time) return 0;
      if (!a.due_time) return 1;
      if (!b.due_time) return -1;
      return a.due_time.localeCompare(b.due_time);
    });
  }, [incompleteTodos, pinnedIds]);

  const sortedCompleted = useMemo(() => {
    return [...completedTodos].sort((a, b) => {
      const ca = a.completed_at ?? '';
      const cb = b.completed_at ?? '';
      return cb.localeCompare(ca); // most recently completed first
    });
  }, [completedTodos]);

  // Split into pinned / unpinned groups for rendering
  const pinnedTodos = sortedIncomplete.filter((t) => pinnedIds.has(t.id));
  const unpinnedTodos = sortedIncomplete.filter((t) => !pinnedIds.has(t.id));
  const hasPinned = pinnedTodos.length > 0;
  const isEmpty = sortedIncomplete.length === 0 && completedTodos.length === 0;

  const handleQuickCreate = useCallback(async () => {
    if (isQuickCreating) {
      return;
    }

    const title = quickCreateTitle.trim();
    if (!title) {
      return;
    }

    setIsQuickCreating(true);
    try {
      const created = await onQuickCreateTodo(title);
      if (!created) {
        return;
      }

      setQuickCreateTitle('');
      requestAnimationFrame(() => {
        quickCreateInputRef.current?.focus();
      });
    } finally {
      setIsQuickCreating(false);
    }
  }, [isQuickCreating, onQuickCreateTodo, quickCreateTitle]);

  const handleQuickCreateKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || e.nativeEvent.isComposing) {
        return;
      }

      e.preventDefault();
      await handleQuickCreate();
    },
    [handleQuickCreate],
  );

  const renderQuickCreateInput = (isEmptyState = false) => (
    <div
      className={`${styles.quickCreateWrap} ${isEmptyState ? styles.quickCreateWrapEmpty : ''} ${isQuickCreating ? styles.quickCreateWrapBusy : ''}`}
    >
      <span className={styles.quickCreateIcon} aria-hidden="true">+</span>
      <input
        ref={quickCreateInputRef}
        className={styles.quickCreateInput}
        type="text"
        placeholder="输入待办标题，回车创建"
        value={quickCreateTitle}
        onChange={(e) => setQuickCreateTitle(e.target.value)}
        onKeyDown={handleQuickCreateKeyDown}
        disabled={isQuickCreating}
        autoFocus={isEmptyState}
      />
      <span className={styles.quickCreateHint}>{isQuickCreating ? '创建中' : '回车'}</span>
    </div>
  );

  return (
    <div className={styles.panel}>
      {/* Panel header */}
      <div className={styles.header}>
        <h2 className={styles.title}>待办事项</h2>
        <button type="button" className={styles.closeBtn} onClick={onClose} title="关闭面板">
          &times;
        </button>
      </div>

      {/* Quick create */}
      {!isEmpty && renderQuickCreateInput()}

      {/* Filter tabs */}
      <div className={styles.filterTabs}>
        {(['all', 'unscheduled', 'today', 'upcoming'] as TodoFilterType[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all'
              ? '全部'
              : f === 'today'
                ? '今天'
                : f === 'upcoming'
                  ? '即将到来'
                  : '待定ddl'}
          </button>
        ))}
      </div>

      {/* Incomplete todos */}
      <div className={styles.list}>
        {isEmpty ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="6" width="36" height="36" rx="4" strokeDasharray="4 2" />
              <path d="M16 24l6 6 10-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>暂无待办事项</span>
            {renderQuickCreateInput(true)}
          </div>
        ) : (
          <>
            {/* Pinned group */}
            {hasPinned && (
              <>
                <div className={styles.groupLabel}>
                  <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" style={{ opacity: 0.5 }}>
                    <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
                  </svg>
                  置顶
                </div>
                {pinnedTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    calendar={calendarMap.get(todo.calendar_id)}
                    onToggle={onToggleTodo}
                    onEdit={onEditTodo}
                    onDelete={onDeleteTodo}
                    isPinned
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </>
            )}

            {/* Unpinned group */}
            {hasPinned && unpinnedTodos.length > 0 && (
              <div className={styles.groupLabel}>其他</div>
            )}
            {unpinnedTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                calendar={calendarMap.get(todo.calendar_id)}
                onToggle={onToggleTodo}
                onEdit={onEditTodo}
                onDelete={onDeleteTodo}
                isPinned={false}
                onTogglePin={handleTogglePin}
              />
            ))}
          </>
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
