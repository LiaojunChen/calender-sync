// ============================================================
// CalendarScreen – main calendar view with swipe navigation
// ============================================================
//
// Renders Month / Week / Day / Agenda views depending on the
// active view type supplied by DrawerNavigator.  Left/right swipe
// gestures navigate the calendar, pull-to-refresh triggers a data sync.
// ============================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useNetworkSync } from '../hooks/useNetworkSync';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
import AgendaView from '../components/calendar/AgendaView';
import type { Calendar, Event, Todo } from '@project-calendar/shared';
import { addDays, addMonths, startOfWeek } from '@project-calendar/shared';
import {
  cancelAllScheduledNotifications,
  scheduleNotificationsForItems,
} from '../notifications/scheduler';
import { createDemoCalendarData } from '../data/demoCalendarData';
import { syncWidgetData } from '../widget/widgetSync';
import type { DrawerParamList } from '../navigation/DrawerNavigator';

// ---------------------------------------------------------------------------
// View type (mirrors DrawerNavigator)
// ---------------------------------------------------------------------------

type ViewType = 'month' | 'week' | 'day' | 'agenda';

// ---------------------------------------------------------------------------
// Swipe thresholds
// ---------------------------------------------------------------------------

const SWIPE_MIN_DX = 50;
const SWIPE_MAX_DY = 100;

// ---------------------------------------------------------------------------
// Date navigation helpers
// ---------------------------------------------------------------------------

function navigateDate(
  date: Date,
  view: ViewType,
  direction: -1 | 1,
): Date {
  switch (view) {
    case 'month':
      return addMonths(date, direction);
    case 'week': {
      const ws = startOfWeek(date, 1);
      return addDays(ws, direction * 7);
    }
    case 'day':
      return addDays(date, direction);
    case 'agenda':
      return addDays(date, direction * 7);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type CalendarRouteProp = RouteProp<DrawerParamList, 'CalendarTab'>;

export default function CalendarScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const route = useRoute<CalendarRouteProp>();
  const requestedView = route.params?.initialView ?? 'month';

  const [currentView, setCurrentView] = useState<ViewType>(requestedView);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Demo UI data remains local, but widget sync now uses a dedicated data source.
  const demoData = useMemo(() => createDemoCalendarData(), []);
  const events = demoData.events as Event[];
  const todos = demoData.todos as Todo[];
  const calendars = demoData.calendars as Calendar[];

  useEffect(() => {
    if (route.params?.initialView) {
      setCurrentView(route.params.initialView);
    }
    if (route.params?.focusDate === 'today') {
      setCurrentDate(new Date());
    } else if (route.params?.focusDate) {
      const nextDate = new Date(route.params.focusDate);
      if (!Number.isNaN(nextDate.getTime())) {
        setCurrentDate(nextDate);
      }
    }
  }, [route.params?.focusDate, route.params?.initialView]);

  // Reschedule notifications and refresh widget whenever data changes
  useEffect(() => {
    void (async () => {
      try {
        await cancelAllScheduledNotifications();
        await scheduleNotificationsForItems(events, todos, calendars);
        await syncWidgetData();
        setFetchError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '同步失败，请重试';
        setFetchError(message);
        Alert.alert('同步失败', '数据同步遇到问题，请稍后重试。', [
          { text: '好的', style: 'cancel' },
        ]);
      }
    })();
  }, [events, todos, calendars]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setFetchError(null);
    void syncWidgetData().catch(() => {
      // CalendarScreen already surfaces fetch errors through the effect.
    });
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  // Auto-retry sync when network reconnects
  const { isConnected } = useNetworkSync(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh]),
  );

  // Day selection from month/week headers
  const handleDaySelect = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // -------------------------------------------------------------------------
  // Swipe gesture via PanResponder
  // -------------------------------------------------------------------------

  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (
        _evt: GestureResponderEvent,
        gs: PanResponderGestureState,
      ) => {
        // Only capture predominantly horizontal swipes
        return (
          Math.abs(gs.dx) > 10 &&
          Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5
        );
      },
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        swipeStartRef.current = { x: locationX, y: locationY };
      },
      onPanResponderRelease: (
        _evt: GestureResponderEvent,
        gs: PanResponderGestureState,
      ) => {
        const { dx, dy } = gs;
        if (
          Math.abs(dx) >= SWIPE_MIN_DX &&
          Math.abs(dy) <= SWIPE_MAX_DY
        ) {
          const direction: -1 | 1 = dx < 0 ? 1 : -1;
          setCurrentDate((prev) =>
            navigateDate(prev, currentView, direction),
          );
        }
        swipeStartRef.current = null;
      },
    }),
  ).current;

  // -------------------------------------------------------------------------
  // Render active view
  // -------------------------------------------------------------------------

  const viewContent = useMemo(() => {
    switch (currentView) {
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            events={events}
            todos={todos}
            calendars={calendars}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onDaySelect={handleDaySelect}
          />
        );
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            events={events}
            calendars={calendars}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onDayPress={handleDaySelect}
          />
        );
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            events={events}
            calendars={calendars}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        );
      case 'agenda':
        return (
          <AgendaView
            currentDate={currentDate}
            events={events}
            todos={todos}
            calendars={calendars}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        );
    }
  }, [
    currentView,
    currentDate,
    events,
    todos,
    calendars,
    refreshing,
    handleRefresh,
    handleDaySelect,
  ]);

  // Expose view/date change for DrawerNavigator (via context or callback ref)
  // This stub makes the setters accessible; Task 11 will wire them properly
  // via React context if needed.
  void setCurrentView; // suppress unused-var lint until wired

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      {...panResponder.panHandlers}
    >
      {/* Offline banner */}
      {!isConnected && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.danger }]}>
          <Text style={styles.offlineBannerText}>
            网络连接失败，请检查您的网络
          </Text>
        </View>
      )}
      {/* Error banner (shown when connected but sync failed) */}
      {isConnected && fetchError !== null && (
        <View style={[styles.errorBanner, { backgroundColor: colors.danger }]}>
          <Text style={styles.errorBannerText}>同步失败，请重试</Text>
        </View>
      )}
      {viewContent}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
