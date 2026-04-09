'use client';

import React, { useMemo } from 'react';
import { useAppContext, type ViewType } from '@/contexts/AppContext';
import DayView from '@/components/calendar/DayView';
import WeekView from '@/components/calendar/WeekView';
import { generateDemoEvents, DEMO_CALENDARS } from '@/lib/demo-events';
import styles from './MainArea.module.css';

const VIEW_NAMES: Record<ViewType, string> = {
  day: '\u65E5\u89C6\u56FE',
  week: '\u5468\u89C6\u56FE',
  month: '\u6708\u89C6\u56FE',
  agenda: '\u8BAE\u7A0B\u89C6\u56FE',
};

export default function MainArea() {
  const { state } = useAppContext();

  // Use real calendars if available, fall back to demo
  const calendars = state.calendars.length > 0 ? state.calendars : DEMO_CALENDARS;

  // Use demo events for now (will be replaced by Supabase fetch later)
  const events = useMemo(
    () => generateDemoEvents(state.currentDate),
    [state.currentDate],
  );

  function renderView() {
    switch (state.currentView) {
      case 'day':
        return (
          <DayView
            currentDate={state.currentDate}
            events={events}
            calendars={calendars}
          />
        );
      case 'week':
        return (
          <WeekView
            currentDate={state.currentDate}
            events={events}
            calendars={calendars}
          />
        );
      case 'month':
      case 'agenda':
      default:
        return (
          <div className={styles.placeholder}>
            <span className={styles.placeholderTitle}>
              {VIEW_NAMES[state.currentView]}
            </span>
            <span className={styles.placeholderSubtitle}>
              {'\u89C6\u56FE\u7EC4\u4EF6\u5C06\u5728\u540E\u7EED\u4EFB\u52A1\u4E2D\u5B9E\u73B0'}
            </span>
          </div>
        );
    }
  }

  return <main className={styles.mainArea}>{renderView()}</main>;
}
