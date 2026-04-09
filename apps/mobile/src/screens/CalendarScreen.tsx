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
import { broadcastWidgetRefresh } from '../widget/widgetDataBridge';

// ---------------------------------------------------------------------------
// View type (mirrors DrawerNavigator)
// ---------------------------------------------------------------------------

type ViewType = 'month' | 'week' | 'day' | 'agenda';

// ---------------------------------------------------------------------------
// Mock data – replace with real Supabase queries in Task 11
// ---------------------------------------------------------------------------

const TODAY = new Date();

const MOCK_CALENDARS: Calendar[] = [
  {
    id: 'cal-1',
    user_id: 'user-1',
    name: '个人',
    color: '#1a73e8',
    is_visible: true,
    is_default: true,
    sort_order: 0,
    created_at: TODAY.toISOString(),
    updated_at: TODAY.toISOString(),
  },
  {
    id: 'cal-2',
    user_id: 'user-1',
    name: '工作',
    color: '#34a853',
    is_visible: true,
    is_default: false,
    sort_order: 1,
    created_at: TODAY.toISOString(),
    updated_at: TODAY.toISOString(),
  },
];

function makeDateStr(date: Date, hour: number, minute: number): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const MOCK_EVENTS: Event[] = [
  {
    id: 'ev-1',
    user_id: 'user-1',
    calendar_id: 'cal-2',
    title: '团队早会',
    description: null,
    location: '会议室 A',
    start_time: makeDateStr(TODAY, 9, 0),
    end_time: makeDateStr(TODAY, 9, 30),
    is_all_day: false,
    color: null,
    recurrence_rule_id: null,
    deleted_at: null,
    created_at: TODAY.toISOString(),
    updated_at: TODAY.toISOString(),
  },
  {
    id: 'ev-2',
    user_id: 'user-1',
    calendar_id: 'cal-2',
    title: 'Code Review',
    description: null,
    location: null,
    start_time: makeDateStr(TODAY, 14, 0),
    end_time: makeDateStr(TODAY, 15, 0),
    is_all_day: false,
    color: null,
    recurrence_rule_id: null,
    deleted_at: null,
    created_at: TODAY.toISOString(),
    updated_at: TODAY.toISOString(),
  },
  {
    id: 'ev-3',
    user_id: 'user-1',
    calendar_id: 'cal-1',
    title: '健身',
    description: null,
    location: '体育馆',
    start_time: makeDateStr(addDays(TODAY, 1), 7, 0),
    end_time: makeDateStr(addDays(TODAY, 1), 8, 0),
    is_all_day: false,
    color: '#e91e63',
    recurrence_rule_id: null,
    deleted_at: null,
    created_at: TODAY.toISOString(),
    updated_at: TODAY.toISOString(),
  },
  {
    id: 'ev-4',
    user_id: 'user-1',
    calendar_id: 'cal-1',
    title: '生日',
    description: null,
    location: null,
    start_time: makeDateStr(addDays(TODAY, 2), 0, 0),
    end_time: makeDateStr(addDays(TODAY, 2), 23, 59),
    is_all_day: true,
    color: '#ff9800',
    recurrence_rule_id: null,
    deleted_at: null,
    created_at: TODAY.toISOString(),
    updated_at: TODAY.toISOString(),
  },
];

const MOCK_TODOS: Todo[] = [
  {
    id: 'todo-1',
    user_id: 'user-1',
    calendar_id: 'cal-1',
    title: '提交报告',
    description: null,
    due_date: (() => {
      const d = new Date(TODAY);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    due_time: '17:00',
    is_completed: false,
    completed_at: null,
    color: null,
    deleted_at: null,
    created_at: TODAY.toISOString(),
    updated_at: TODAY.toISOString(),
  },
];

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
// Props (CalendarScreen receives these from DrawerNavigator via route)
// ---------------------------------------------------------------------------

interface CalendarScreenProps {
  /** Override from drawer – defaults to 'month' */
  initialView?: ViewType;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarScreen({
  initialView = 'month',
}: CalendarScreenProps): React.JSX.Element {
  const { colors } = useTheme();

  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Events and calendars (mock; replaced by real data in Task 11)
  const [events] = useState<Event[]>(MOCK_EVENTS);
  const [todos] = useState<Todo[]>(MOCK_TODOS);
  const [calendars] = useState<Calendar[]>(MOCK_CALENDARS);

  // Reschedule notifications and refresh widget whenever data changes
  useEffect(() => {
    void (async () => {
      try {
        await cancelAllScheduledNotifications();
        await scheduleNotificationsForItems(events, todos, calendars);
        // Keep the home-screen widget in sync after any data change
        // (covers: event create/edit/delete, todo toggle, pull-to-refresh)
        await broadcastWidgetRefresh(events, todos, calendars);
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
    // Simulate async data refresh (replace with real Supabase query in Task 11).
    // broadcastWidgetRefresh is called automatically by the data-change effect above.
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
