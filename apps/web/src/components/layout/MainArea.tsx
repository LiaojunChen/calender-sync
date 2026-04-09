'use client';

import React from 'react';
import { useAppContext, type ViewType } from '@/contexts/AppContext';
import styles from './MainArea.module.css';

const VIEW_ICONS: Record<ViewType, string> = {
  day: '📅',
  week: '📆',
  month: '🗓',
  agenda: '📋',
};

const VIEW_NAMES: Record<ViewType, string> = {
  day: '日视图',
  week: '周视图',
  month: '月视图',
  agenda: '议程视图',
};

export default function MainArea() {
  const { state } = useAppContext();

  return (
    <main className={styles.mainArea}>
      <div className={styles.placeholder}>
        <span className={styles.placeholderIcon}>{VIEW_ICONS[state.currentView]}</span>
        <span className={styles.placeholderTitle}>{VIEW_NAMES[state.currentView]}</span>
        <span className={styles.placeholderSubtitle}>
          视图组件将在后续任务中实现
        </span>
      </div>
    </main>
  );
}
