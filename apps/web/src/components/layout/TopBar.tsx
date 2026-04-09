'use client';

import React, { useState, useRef, useEffect } from 'react';
import { formatDateRangeCN, formatDateCN, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from '@project-calendar/shared';
import { useAppContext, type ViewType, type ThemeMode } from '@/contexts/AppContext';
import styles from './TopBar.module.css';

const VIEW_LABELS: Record<ViewType, string> = {
  day: '日',
  week: '周',
  month: '月',
  agenda: '议程',
};

const THEME_LABELS: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
  system: '系统',
};

export default function TopBar() {
  const { state, setView, toggleSidebar, navigateToday, navigatePrev, navigateNext, setTheme } =
    useAppContext();
  const [searchValue, setSearchValue] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [settingsOpen]);

  // Compute the date range title
  function getDateTitle(): string {
    const d = state.currentDate;
    switch (state.currentView) {
      case 'day':
        return formatDateCN(d);
      case 'week': {
        const ws = startOfWeek(d, 1);
        const we = endOfWeek(d, 1);
        return formatDateRangeCN(ws, we);
      }
      case 'month': {
        return `${d.getFullYear()}年${d.getMonth() + 1}月`;
      }
      case 'agenda':
        return formatDateCN(d);
      default:
        return formatDateCN(d);
    }
  }

  return (
    <header className={styles.topBar}>
      {/* Hamburger */}
      <button className={styles.iconButton} onClick={toggleSidebar} title="切换侧边栏">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
      </button>

      {/* Logo */}
      <span className={styles.logo}>
        <span className={styles.logoAccent}>Project</span> Calendar
      </span>

      {/* Today button */}
      <button className={styles.todayButton} onClick={navigateToday}>
        今天
      </button>

      {/* Prev/Next nav */}
      <div className={styles.navGroup}>
        <button className={styles.iconButton} onClick={navigatePrev} title="上一页">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <button className={styles.iconButton} onClick={navigateNext} title="下一页">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>

      {/* Date range title */}
      <span className={styles.dateTitle}>{getDateTitle()}</span>

      <div className={styles.spacer} />

      {/* Search */}
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="搜索"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* View switcher */}
      <select
        className={styles.viewSwitcher}
        value={state.currentView}
        onChange={(e) => setView(e.target.value as ViewType)}
      >
        {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
          <option key={v} value={v}>
            {VIEW_LABELS[v]}
          </option>
        ))}
      </select>

      {/* Settings */}
      <div className={styles.settingsArea}>
        <div className={styles.settingsDropdownWrapper} ref={settingsRef}>
          <button
            className={styles.iconButton}
            onClick={() => setSettingsOpen(!settingsOpen)}
            title="设置"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </button>

          {settingsOpen && (
            <div className={styles.settingsDropdown}>
              <div className={styles.settingsDropdownLabel}>主题</div>
              <div className={styles.themeOptions}>
                {(Object.keys(THEME_LABELS) as ThemeMode[]).map((t) => (
                  <button
                    key={t}
                    className={`${styles.themeOption} ${state.theme === t ? styles.themeOptionActive : ''}`}
                    onClick={() => setTheme(t)}
                  >
                    {THEME_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
