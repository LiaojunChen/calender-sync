'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import DayView from '@/components/calendar/DayView';
import WeekView from '@/components/calendar/WeekView';
import MonthView from '@/components/calendar/MonthView';
import AgendaView from '@/components/calendar/AgendaView';
import { generateDemoEvents, DEMO_CALENDARS } from '@/lib/demo-events';
import styles from './MainArea.module.css';

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
        return (
          <MonthView
            currentDate={state.currentDate}
            events={events}
            calendars={calendars}
          />
        );
      case 'agenda':
        return (
          <AgendaView
            currentDate={state.currentDate}
            events={events}
            calendars={calendars}
          />
        );
      default:
        return null;
    }
  }

  return <main className={styles.mainArea}>{renderView()}</main>;
}
