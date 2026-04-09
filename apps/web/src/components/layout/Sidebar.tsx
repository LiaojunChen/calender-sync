'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import MiniCalendar from '@/components/calendar/MiniCalendar';
import CalendarList from '@/components/calendar/CalendarList';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { state, dispatch } = useAppContext();
  const [miniCalYear, setMiniCalYear] = useState(new Date().getFullYear());
  const [miniCalMonth, setMiniCalMonth] = useState(new Date().getMonth());

  const sidebarClass = `${styles.sidebar} ${!state.sidebarOpen ? styles.sidebarCollapsed : ''}`;

  return (
    <aside className={sidebarClass}>
      {/* Create button */}
      <button className={styles.createButton} title="创建">
        <span className={styles.createButtonIcon}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <path fill="#34A853" d="M16 16v14h4V20z" />
            <path fill="#4285F4" d="M30 16H20l-4 4h14z" />
            <path fill="#FBBC04" d="M6 16v4h10l4-4z" />
            <path fill="#EA4335" d="M20 16V6h-4v14z" />
          </svg>
        </span>
        创建
      </button>

      {/* Mini Calendar */}
      <div className={styles.section}>
        <MiniCalendar
          displayYear={miniCalYear}
          displayMonth={miniCalMonth}
          onChangeMonth={(y, m) => {
            setMiniCalYear(y);
            setMiniCalMonth(m);
          }}
        />
      </div>

      {/* Calendar List */}
      <div className={styles.section}>
        <CalendarList />
      </div>

      {/* Todo toggle */}
      <div className={styles.section}>
        <button
          type="button"
          className={`${styles.todoToggleBtn} ${state.todoPanelOpen ? styles.todoToggleBtnActive : ''}`}
          onClick={() => dispatch({ type: 'SET_TODO_PANEL_OPEN', open: !state.todoPanelOpen })}
          title={state.todoPanelOpen ? '隐藏待办面板' : '显示待办面板'}
        >
          <span className={styles.todoToggleIcon}>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="14" height="14" rx="2" />
              <path d="M7 7h6M7 10h6M7 13h4" />
              <rect x="3" y="3" width="4" height="4" rx="1" fill="currentColor" stroke="none" opacity="0.3" />
            </svg>
          </span>
          待办事项
        </button>
      </div>
    </aside>
  );
}
