// ============================================================
// DayView – single-column time grid for mobile
// ============================================================

import React, { useEffect, useRef } from 'react';
import { ScrollView, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import TimeGrid, {
  HOUR_HEIGHT,
  minutesFromMidnight,
  type TimeGridEvent,
} from './TimeGrid';
import type { Calendar, Event } from '@project-calendar/shared';
import { isSameDay, formatDateCN } from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  calendars: Calendar[];
  refreshing: boolean;
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DayView({
  currentDate,
  events,
  calendars,
  refreshing,
  onRefresh,
}: DayViewProps): React.JSX.Element {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const now = new Date();

  // Scroll to current time (or 8:00 AM) on mount / date change
  useEffect(() => {
    const isToday = isSameDay(currentDate, now);
    const scrollToMinutes = isToday ? minutesFromMidnight(now) - 60 : 8 * 60;
    const y = (scrollToMinutes / 60) * HOUR_HEIGHT;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: false });
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  // Build visible calendar map
  const calendarMap = new Map<string, Calendar>();
  for (const cal of calendars) {
    calendarMap.set(cal.id, cal);
  }

  // Filter events for this day (only from visible calendars)
  const gridEvents: TimeGridEvent[] = events
    .filter((e) => {
      if (e.deleted_at) return false;
      const cal = calendarMap.get(e.calendar_id);
      if (!cal || !cal.is_visible) return false;
      const start = new Date(e.start_time);
      return isSameDay(start, currentDate);
    })
    .map((e) => ({
      event: e,
      calendar: calendarMap.get(e.calendar_id)!,
    }));

  // All-day events
  const allDayEvents = gridEvents.filter((e) => e.event.is_all_day);
  const timedGridEvents = gridEvents.filter((e) => !e.event.is_all_day);

  const days = [currentDate];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Day header */}
      <View
        style={[styles.dayHeader, { borderBottomColor: colors.border }]}
      >
        <Text style={[styles.dayTitle, { color: colors.text }]}>
          {formatDateCN(currentDate)}
        </Text>
        {isSameDay(currentDate, now) && (
          <View style={[styles.todayBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.todayBadgeText}>今天</Text>
          </View>
        )}
      </View>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <View style={[styles.allDaySection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.allDayLabel, { color: colors.textSecondary }]}>
            全天
          </Text>
          {allDayEvents.map((e) => (
            <View
              key={e.event.id}
              style={[
                styles.allDayEvent,
                { backgroundColor: (e.event.color ?? e.calendar.color) + '33' },
              ]}
            >
              <View
                style={[
                  styles.allDayDot,
                  { backgroundColor: e.event.color ?? e.calendar.color },
                ]}
              />
              <Text
                style={[styles.allDayText, { color: colors.text }]}
                numberOfLines={1}
              >
                {e.event.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Timed grid */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <TimeGrid
          days={days}
          events={timedGridEvents}
          now={now}
        />
      </ScrollView>
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
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  todayBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  allDaySection: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  allDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  allDayEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  allDayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  allDayText: {
    fontSize: 13,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
});
