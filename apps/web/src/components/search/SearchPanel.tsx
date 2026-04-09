'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Event, Todo, Calendar } from '@project-calendar/shared';
import { useAppContext } from '@/contexts/AppContext';
import { getSupabaseClient } from '@/lib/supabase';
import styles from './SearchPanel.module.css';

// ============================================================
// Helpers
// ============================================================

function formatEventTime(event: Event): string {
  const start = new Date(event.start_time);
  if (event.is_all_day) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 全天`;
  }
  const end = new Date(event.end_time);
  const datePart = `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;
  const timePart = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')} – ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  return `${datePart} ${timePart}`;
}

function formatTodoTime(todo: Todo): string {
  if (!todo.due_date) return '无截止日期';
  const d = new Date(todo.due_date);
  const datePart = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  if (todo.due_time) {
    return `${datePart} ${todo.due_time.slice(0, 5)}`;
  }
  return datePart;
}

function matchesQuery(text: string | null | undefined, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

// ============================================================
// Search result types
// ============================================================

type SearchResultEvent = {
  kind: 'event';
  id: string;
  title: string;
  subtitle: string;
  color: string;
  date: Date;
  event: Event;
};

type SearchResultTodo = {
  kind: 'todo';
  id: string;
  title: string;
  subtitle: string;
  color: string;
  date: Date | null;
  todo: Todo;
};

type SearchResult = SearchResultEvent | SearchResultTodo;

// ============================================================
// Component
// ============================================================

interface SearchPanelProps {
  onClose: () => void;
}

export default function SearchPanel({ onClose }: SearchPanelProps) {
  const { state, dispatch, setDate, setView } = useAppContext();
  const { searchQuery, events, todos, calendars } = state;

  const panelRef = useRef<HTMLDivElement>(null);

  // Build calendar color map
  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cal of calendars) {
      map.set(cal.id, cal.color);
    }
    return map;
  }, [calendars]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Search logic
  const results = useMemo<SearchResult[]>(() => {
    const q = searchQuery.trim();
    if (!q) return [];

    const eventResults: SearchResultEvent[] = events
      .filter(
        (ev) =>
          !ev.deleted_at &&
          (matchesQuery(ev.title, q) ||
            matchesQuery(ev.description, q) ||
            matchesQuery(ev.location, q))
      )
      .map((ev) => ({
        kind: 'event' as const,
        id: ev.id,
        title: ev.title,
        subtitle: formatEventTime(ev),
        color: ev.color ?? calendarColorMap.get(ev.calendar_id) ?? '#1a73e8',
        date: new Date(ev.start_time),
        event: ev,
      }));

    const todoResults: SearchResultTodo[] = todos
      .filter(
        (todo) =>
          !todo.deleted_at &&
          (matchesQuery(todo.title, q) || matchesQuery(todo.description, q))
      )
      .map((todo) => ({
        kind: 'todo' as const,
        id: todo.id,
        title: todo.title,
        subtitle: formatTodoTime(todo),
        color: todo.color ?? calendarColorMap.get(todo.calendar_id) ?? '#1a73e8',
        date: todo.due_date ? new Date(todo.due_date) : null,
        todo,
      }));

    // Merge and sort: events by start_time ascending, todos with due_date, then null dates
    const all: SearchResult[] = [...eventResults, ...todoResults];
    all.sort((a, b) => {
      const aTime = a.date?.getTime() ?? Infinity;
      const bTime = b.date?.getTime() ?? Infinity;
      return aTime - bTime;
    });

    return all.slice(0, 50); // limit results
  }, [searchQuery, events, todos, calendarColorMap]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      if (result.kind === 'event') {
        const date = new Date(result.event.start_time);
        setDate(date);
        setView('day');
      } else {
        if (result.todo.due_date) {
          const date = new Date(result.todo.due_date);
          setDate(date);
          setView('day');
        }
      }
      onClose();
    },
    [setDate, setView, onClose]
  );

  if (!searchQuery.trim()) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} ref={panelRef}>
        <div className={styles.header}>
          <span className={styles.resultCount}>
            {results.length > 0
              ? `找到 ${results.length} 个结果`
              : `没有找到与 "${searchQuery}" 相关的结果`}
          </span>
          <button className={styles.closeBtn} onClick={onClose} title="关闭搜索">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {results.length > 0 && (
          <ul className={styles.resultList}>
            {results.map((result) => (
              <li key={`${result.kind}-${result.id}`}>
                <button
                  className={styles.resultItem}
                  onClick={() => handleResultClick(result)}
                >
                  <span
                    className={styles.colorDot}
                    style={{ backgroundColor: result.color }}
                  />
                  <span className={styles.resultInfo}>
                    <span className={styles.resultTitle}>{result.title}</span>
                    <span className={styles.resultMeta}>
                      <span className={styles.resultKindBadge}>
                        {result.kind === 'event' ? '事件' : '待办'}
                      </span>
                      {result.subtitle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
