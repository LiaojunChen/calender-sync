// ============================================================
// AgendaView – date-grouped list of events and todos
// ============================================================

import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import EventItem from './EventItem';
import type { Calendar, Event, Todo } from '@project-calendar/shared';
import {
  addDays,
  formatDateCN,
  isSameDay,
  isToday,
  startOfDay,
  toISODateString,
} from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AgendaViewProps {
  currentDate: Date;
  events: Event[];
  todos: Todo[];
  calendars: Calendar[];
  refreshing: boolean;
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

interface DayGroup {
  date: Date;
  items: Array<{ item: Event | Todo; color: string }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgendaView({
  currentDate,
  events,
  todos,
  calendars,
  refreshing,
  onRefresh,
}: AgendaViewProps): React.JSX.Element {
  const { colors } = useTheme();

  // Build calendar map (only visible)
  const calendarMap = useMemo(() => {
    const m = new Map<string, Calendar>();
    for (const cal of calendars) {
      m.set(cal.id, cal);
    }
    return m;
  }, [calendars]);

  // Build 30-day window starting from currentDate
  const groups = useMemo(() => {
    const result: DayGroup[] = [];

    for (let i = 0; i < 30; i++) {
      const day = addDays(startOfDay(currentDate), i);
      const dayKey = toISODateString(day);
      const items: DayGroup['items'] = [];

      // Events on this day
      for (const e of events) {
        if (e.deleted_at) continue;
        const cal = calendarMap.get(e.calendar_id);
        if (!cal || !cal.is_visible) continue;
        const start = new Date(e.start_time);
        if (!isSameDay(start, day)) continue;
        items.push({ item: e, color: e.color ?? cal.color });
      }

      // Todos due on this day
      for (const t of todos) {
        if (t.deleted_at) continue;
        const cal = calendarMap.get(t.calendar_id);
        if (!cal || !cal.is_visible) continue;
        if (!t.due_date) continue;
        if (t.due_date !== dayKey) continue;
        items.push({ item: t, color: t.color ?? cal.color });
      }

      // Sort: all-day first, then by time
      items.sort((a, b) => {
        const aIsAllDay =
          'is_all_day' in a.item ? a.item.is_all_day : !('due_time' in a.item && a.item.due_time);
        const bIsAllDay =
          'is_all_day' in b.item ? b.item.is_all_day : !('due_time' in b.item && b.item.due_time);
        if (aIsAllDay && !bIsAllDay) return -1;
        if (!aIsAllDay && bIsAllDay) return 1;

        const aTime = 'start_time' in a.item ? a.item.start_time : (a.item.due_time ?? '');
        const bTime = 'start_time' in b.item ? b.item.start_time : (b.item.due_time ?? '');
        return aTime.localeCompare(bTime);
      });

      result.push({ date: day, items });
    }

    return result;
  }, [currentDate, events, todos, calendarMap]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {groups.map((group) => {
        const today = isToday(group.date);
        const isSelected = isSameDay(group.date, currentDate);

        return (
          <View key={toISODateString(group.date)} style={styles.dayGroup}>
            {/* Date header */}
            <View
              style={[
                styles.dateHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.dateCircle,
                  today && { backgroundColor: colors.primary },
                  isSelected && !today && { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.dateNum,
                    { color: today ? '#ffffff' : colors.text },
                  ]}
                >
                  {group.date.getDate()}
                </Text>
              </View>
              <View style={styles.dateInfo}>
                <Text style={[styles.dateFullText, { color: colors.text }]}>
                  {formatDateCN(group.date)}
                </Text>
                {today && (
                  <Text
                    style={[styles.todayLabel, { color: colors.primary }]}
                  >
                    今天
                  </Text>
                )}

              </View>
            </View>

            {/* Items */}
            {group.items.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textTertiary }]}>
                无日程
              </Text>
            ) : (
              group.items.map(({ item, color }, idx) => (
                <EventItem
                  key={`${item.id}-${idx}`}
                  item={item}
                  color={color}
                />
              ))
            )}
          </View>
        );
      })}

      {/* Bottom spacer */}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayGroup: {
    marginBottom: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateNum: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateInfo: {
    flex: 1,
  },
  dateFullText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  todayLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  empty: {
    fontSize: 13,
    paddingHorizontal: 64,
    paddingVertical: 10,
    textAlign: 'center',
  },
});
