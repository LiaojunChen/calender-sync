// ============================================================
// WeekView – 7-column time grid for mobile
// ============================================================

import React, { useEffect, useRef } from 'react';
import { ScrollView, RefreshControl, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import TimeGrid, {
  HOUR_HEIGHT,
  minutesFromMidnight,
  type TimeGridEvent,
} from './TimeGrid';
import type { Calendar, Event } from '@project-calendar/shared';
import {
  isSameDay,
  isToday,
  startOfWeek,
  addDays,
} from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// Chinese day-of-week labels (Mon-first)
// ---------------------------------------------------------------------------

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  calendars: Calendar[];
  refreshing: boolean;
  onRefresh: () => void;
  onDayPress?: (date: Date) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WeekView({
  currentDate,
  events,
  calendars,
  refreshing,
  onRefresh,
  onDayPress,
}: WeekViewProps): React.JSX.Element {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const now = new Date();

  // Build the 7 days of the current week (Mon–Sun)
  const weekStart = startOfWeek(currentDate, 1);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Scroll to current time on mount / week change
  useEffect(() => {
    const scrollToMinutes = minutesFromMidnight(now) - 60;
    const y = (scrollToMinutes / 60) * HOUR_HEIGHT;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: false });
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart.toISOString()]);

  // Build visible calendar map
  const calendarMap = new Map<string, Calendar>();
  for (const cal of calendars) {
    calendarMap.set(cal.id, cal);
  }

  // Filter visible timed events for this week
  const gridEvents: TimeGridEvent[] = events
    .filter((e) => {
      if (e.deleted_at || e.is_all_day) return false;
      const cal = calendarMap.get(e.calendar_id);
      if (!cal || !cal.is_visible) return false;
      const start = new Date(e.start_time);
      return days.some((d) => isSameDay(start, d));
    })
    .map((e) => ({
      event: e,
      calendar: calendarMap.get(e.calendar_id)!,
    }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Week header: day-of-week labels + date numbers */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {/* Spacer for hour-label column */}
        <View style={styles.headerSpacer} />
        {days.map((day, idx) => {
          const today = isToday(day);
          const selected = isSameDay(day, currentDate);
          return (
            <Pressable
              key={day.toISOString()}
              style={styles.headerCell}
              onPress={() => onDayPress?.(day)}
            >
              <Text
                style={[styles.weekdayLabel, { color: colors.textSecondary }]}
              >
                {DAY_LABELS[idx]}
              </Text>
              <View
                style={[
                  styles.dateCircle,
                  today && { backgroundColor: colors.primary },
                  selected && !today && { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.dateNumber,
                    { color: today ? '#ffffff' : colors.text },
                    selected && !today && { color: colors.primary, fontWeight: '700' },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

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
        <TimeGrid days={days} events={gridEvents} now={now} />
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
  header: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  headerSpacer: {
    width: 48,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: {
    fontSize: 13,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
});
