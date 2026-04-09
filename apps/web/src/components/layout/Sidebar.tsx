'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import MiniCalendar from '@/components/calendar/MiniCalendar';
import CalendarList from '@/components/calendar/CalendarList';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { state } = useAppContext();
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
    </aside>
  );
}
