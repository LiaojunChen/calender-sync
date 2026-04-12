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
  ActivityIndicator,
  Alert,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useTheme } from '../hooks/useTheme';
import { useAppSettings, weekStartDayToIndex } from '../hooks/useAppSettings';
import { useNetworkSync } from '../hooks/useNetworkSync';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
import AgendaView from '../components/calendar/AgendaView';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  getEventExceptions,
  getRecurrenceRule,
  startOfMonth,
  startOfWeek,
  type Calendar,
  type EventExceptionRow,
} from '@project-calendar/shared';
import {
  cancelAllScheduledNotifications,
  scheduleNotificationsForItems,
} from '../notifications/scheduler';
import { useAppData } from '../hooks/useAppData';
import { getSupabaseClientOrNull, isSupabaseConfigured } from '../lib/supabase';
import {
  expandCalendarEvents,
  type CalendarEventException,
  type EventWithRrule,
} from '../data/expandedEventsCore';
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
  weekStartDayIndex: 0 | 1,
): Date {
  switch (view) {
    case 'month':
      return addMonths(date, direction);
    case 'week': {
      const ws = startOfWeek(date, weekStartDayIndex);
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
type CalendarNavProp = DrawerNavigationProp<DrawerParamList, 'CalendarTab'>;

interface CalendarScreenProps {
  calendarsOverride?: Calendar[];
  defaultView?: ViewType;
}

function buildHeaderTitle(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function getViewRange(
  view: ViewType,
  currentDate: Date,
  weekStartDayIndex: 0 | 1,
): { start: Date; end: Date } {
  switch (view) {
    case 'day': {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 30);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() + 30);
      return { start, end };
    }
    case 'week': {
      const weekStart = startOfWeek(currentDate, weekStartDayIndex);
      const start = addDays(weekStart, -30);
      const weekEnd = endOfWeek(currentDate, weekStartDayIndex);
      const end = addDays(weekEnd, 30);
      return { start, end };
    }
    case 'month': {
      const monthStart = startOfMonth(currentDate);
      const start = addDays(monthStart, -35);
      const monthEnd = endOfMonth(currentDate);
      const end = addDays(monthEnd, 35);
      return { start, end };
    }
    case 'agenda':
    default: {
      const start = addMonths(currentDate, -1);
      const end = addMonths(currentDate, 3);
      return { start, end };
    }
  }
}

function mapExceptionRow(row: EventExceptionRow): CalendarEventException {
  return {
    event_id: row.event_id,
    original_date: row.original_date,
    action: row.action,
    modified_title: row.modified_title,
    modified_start_time: row.modified_start_time,
    modified_end_time: row.modified_end_time,
  };
}

export default function CalendarScreen({
  calendarsOverride,
  defaultView = 'month',
}: CalendarScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const { settings } = useAppSettings();
  const navigation = useNavigation<CalendarNavProp>();
  const route = useRoute<CalendarRouteProp>();
  const requestedView = route.params?.initialView ?? defaultView;
  const weekStartDayIndex = weekStartDayToIndex(settings.week_start_day);

  const [currentView, setCurrentView] = useState<ViewType>(requestedView);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const {
    events,
    todos,
    calendars,
    loading,
    error: dataError,
    refresh,
  } = useAppData();
  const effectiveCalendars = calendarsOverride ?? calendars;
  const [recurrenceRules, setRecurrenceRules] = useState<Record<string, string>>({});
  const [recurrenceExceptions, setRecurrenceExceptions] = useState<CalendarEventException[]>([]);
  const currentViewRef = useRef<ViewType>(currentView);
  const weekStartDayIndexRef = useRef<0 | 1>(weekStartDayIndex);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    weekStartDayIndexRef.current = weekStartDayIndex;
  }, [weekStartDayIndex]);

  useEffect(() => {
    if (route.params?.initialView) {
      setCurrentView(route.params.initialView);
    } else if (!route.params) {
      setCurrentView(defaultView);
    }
    if (route.params?.focusDate === 'today') {
      setCurrentDate(new Date());
    } else if (route.params?.focusDate) {
      const nextDate = new Date(route.params.focusDate);
      if (!Number.isNaN(nextDate.getTime())) {
        setCurrentDate(nextDate);
      }
    }
  }, [defaultView, route.params?.focusDate, route.params?.initialView]);

  useEffect(() => {
    const nextTitle = buildHeaderTitle(currentDate);
    if (route.params?.headerTitle === nextTitle) {
      return;
    }
    navigation.setParams({ headerTitle: nextTitle });
  }, [currentDate, navigation, route.params?.headerTitle]);

  useEffect(() => {
    const recurringEvents = events.filter((event) => event.recurrence_rule_id);
    if (!isSupabaseConfigured || recurringEvents.length === 0) {
      setRecurrenceRules({});
      setRecurrenceExceptions([]);
      return;
    }

    const client = getSupabaseClientOrNull();
    if (!client) {
      setRecurrenceRules({});
      setRecurrenceExceptions([]);
      return;
    }

    let active = true;

    void (async () => {
      try {
        const [ruleEntries, exceptionEntries] = await Promise.all([
          Promise.all(
            recurringEvents.map(async (event) => {
              if (!event.recurrence_rule_id) {
                return null;
              }
              const result = await getRecurrenceRule(client, event.recurrence_rule_id);
              if (!result.data?.rrule_string) {
                return null;
              }
              return [event.id, result.data.rrule_string] as const;
            }),
          ),
          Promise.all(
            recurringEvents.map(async (event) => {
              const result = await getEventExceptions(client, event.id);
              return result.data ?? [];
            }),
          ),
        ]);

        if (!active) {
          return;
        }

        setRecurrenceRules(
          Object.fromEntries(
            ruleEntries.filter(
              (entry): entry is readonly [string, string] => entry !== null,
            ),
          ),
        );
        setRecurrenceExceptions(exceptionEntries.flat().map(mapExceptionRow));
      } catch (error) {
        if (!active) {
          return;
        }
        setSyncError(error instanceof Error ? error.message : '加载重复日程失败');
      }
    })();

    return () => {
      active = false;
    };
  }, [events]);

  const viewRange = useMemo(
    () => getViewRange(currentView, currentDate, weekStartDayIndex),
    [currentView, currentDate, weekStartDayIndex],
  );
  const displayEvents = useMemo(() => {
    const enrichedEvents: EventWithRrule[] = events.map((event) => ({
      ...event,
      rrule_string: recurrenceRules[event.id] ?? null,
    }));

    return expandCalendarEvents(
      enrichedEvents,
      viewRange.start,
      viewRange.end,
      recurrenceExceptions,
    );
  }, [events, recurrenceRules, recurrenceExceptions, viewRange]);

  // Reschedule notifications and refresh widget whenever data changes
  useEffect(() => {
    if (loading) return;

    void (async () => {
      try {
        await cancelAllScheduledNotifications();
        await scheduleNotificationsForItems(displayEvents, todos, effectiveCalendars);
        await syncWidgetData();
        setSyncError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '同步失败，请重试';
        setSyncError(message);
        Alert.alert('同步失败', '数据同步遇到问题，请稍后重试。', [
          { text: '好的', style: 'cancel' },
        ]);
      }
    })();
  }, [displayEvents, todos, effectiveCalendars, loading]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setSyncError(null);
    void refresh()
      .catch(() => {
        // Data-fetch errors are surfaced through the hook state.
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [refresh]);

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
            navigateDate(
              prev,
              currentViewRef.current,
              direction,
              weekStartDayIndexRef.current,
            ),
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
            events={displayEvents}
            todos={todos}
            calendars={effectiveCalendars}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onDaySelect={handleDaySelect}
            weekStartDay={settings.week_start_day}
          />
        );
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            events={displayEvents}
            calendars={effectiveCalendars}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onDayPress={handleDaySelect}
            weekStartDay={settings.week_start_day}
          />
        );
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            events={displayEvents}
            calendars={effectiveCalendars}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        );
      case 'agenda':
        return (
          <AgendaView
            currentDate={currentDate}
            events={displayEvents}
            todos={todos}
            calendars={effectiveCalendars}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        );
    }
  }, [
    currentView,
    currentDate,
    displayEvents,
    todos,
    effectiveCalendars,
    refreshing,
    handleRefresh,
    handleDaySelect,
  ]);

  const screenError = dataError ?? syncError;

  if (loading && events.length === 0 && todos.length === 0 && effectiveCalendars.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

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
      {isConnected && screenError !== null && (
        <View style={[styles.errorBanner, { backgroundColor: colors.danger }]}>
          <Text style={styles.errorBannerText}>{screenError}</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
