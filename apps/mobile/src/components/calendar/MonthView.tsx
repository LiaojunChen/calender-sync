// ============================================================
// MonthView – month grid with expand/collapse drag handle
// ============================================================

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
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
  startOfMonth,
  startOfWeek,
  toISODateString,
} from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const CELL_HEIGHT = 52; // px per calendar row
const COLLAPSED_ROWS = 1;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  todos: Todo[];
  calendars: Calendar[];
  refreshing: boolean;
  onRefresh: () => void;
  onDaySelect: (date: Date) => void;
}

// ---------------------------------------------------------------------------
// Helper: build a 6-row calendar grid (Mon-first)
// ---------------------------------------------------------------------------

function buildMonthGrid(date: Date): Date[][] {
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeek(monthStart, 1); // Monday
  const grid: Date[][] = [];
  for (let row = 0; row < 6; row++) {
    const week: Date[] = [];
    for (let col = 0; col < 7; col++) {
      week.push(addDays(gridStart, row * 7 + col));
    }
    grid.push(week);
  }
  return grid;
}

// Find the row index that contains `date`
function findRowForDate(grid: Date[][], date: Date): number {
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].some((d) => isSameDay(d, date))) return i;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MonthView({
  currentDate,
  events,
  todos,
  calendars,
  refreshing,
  onRefresh,
  onDaySelect,
}: MonthViewProps): React.JSX.Element {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Animated grid height
  const grid = useMemo(() => buildMonthGrid(currentDate), [currentDate]);
  const selectedRow = useMemo(
    () => findRowForDate(grid, currentDate),
    [grid, currentDate],
  );

  const collapsedHeight = CELL_HEIGHT; // one row
  const expandedHeight = CELL_HEIGHT * grid.length;

  const animHeight = useRef(
    new Animated.Value(collapsedHeight),
  ).current;

  // Animate on expand/collapse toggle
  const toggleExpanded = useCallback(
    (toExpanded: boolean) => {
      setExpanded(toExpanded);
      Animated.spring(animHeight, {
        toValue: toExpanded ? expandedHeight : collapsedHeight,
        useNativeDriver: false,
        bounciness: 4,
      }).start();
    },
    [animHeight, expandedHeight, collapsedHeight],
  );

  // Build calendar map
  const calendarMap = useMemo(() => {
    const m = new Map<string, Calendar>();
    for (const cal of calendars) {
      m.set(cal.id, cal);
    }
    return m;
  }, [calendars]);

  // Map date string -> array of calendar colors with events
  const eventColorsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of events) {
      if (e.deleted_at) continue;
      const cal = calendarMap.get(e.calendar_id);
      if (!cal || !cal.is_visible) continue;
      const key = toISODateString(new Date(e.start_time));
      const existing = map.get(key) ?? [];
      const color = e.color ?? cal.color;
      if (!existing.includes(color)) existing.push(color);
      map.set(key, existing);
    }
    for (const t of todos) {
      if (t.deleted_at || !t.due_date) continue;
      const cal = calendarMap.get(t.calendar_id);
      if (!cal || !cal.is_visible) continue;
      const key = t.due_date;
      const existing = map.get(key) ?? [];
      const color = t.color ?? cal.color;
      if (!existing.includes(color)) existing.push(color);
      map.set(key, existing);
    }
    return map;
  }, [events, todos, calendarMap]);

  // Events and todos for selected day (for the list below)
  const selectedDayKey = toISODateString(currentDate);
  const selectedDayItems = useMemo(() => {
    const items: Array<{ item: Event | Todo; color: string }> = [];

    for (const e of events) {
      if (e.deleted_at) continue;
      const cal = calendarMap.get(e.calendar_id);
      if (!cal || !cal.is_visible) continue;
      const start = new Date(e.start_time);
      if (!isSameDay(start, currentDate)) continue;
      items.push({ item: e, color: e.color ?? cal.color });
    }

    for (const t of todos) {
      if (t.deleted_at || !t.due_date) continue;
      const cal = calendarMap.get(t.calendar_id);
      if (!cal || !cal.is_visible) continue;
      if (t.due_date !== selectedDayKey) continue;
      items.push({ item: t, color: t.color ?? cal.color });
    }

    items.sort((a, b) => {
      const aTime = 'start_time' in a.item ? a.item.start_time : (a.item.due_time ?? '');
      const bTime = 'start_time' in b.item ? b.item.start_time : (b.item.due_time ?? '');
      return aTime.localeCompare(bTime);
    });

    return items;
  }, [currentDate, events, todos, calendarMap, selectedDayKey]);

  // Drag handle pan responder
  const dragStartExpanded = useRef(expanded);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dy) > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderGrant: () => {
        dragStartExpanded.current = expanded;
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 30 && !dragStartExpanded.current) {
          // dragged down while collapsed → expand
          toggleExpanded(true);
        } else if (gs.dy < -30 && dragStartExpanded.current) {
          // dragged up while expanded → collapse
          toggleExpanded(false);
        }
      },
    }),
  ).current;

  // The rows we actually show: in collapsed mode, show only selectedRow's row;
  // in expanded mode show all rows.
  const visibleRows = expanded
    ? grid
    : [grid[selectedRow]];

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      {/* Month calendar grid */}
      <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
        {/* Month label (shown only when expanded) */}
        {expanded && (
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {`${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`}
          </Text>
        )}

        {/* Weekday header */}
        <View style={styles.weekdayHeader}>
          {DAY_LABELS.map((label) => (
            <Text
              key={label}
              style={[styles.weekdayLabel, { color: colors.textSecondary }]}
            >
              {label}
            </Text>
          ))}
        </View>

        {/* Grid rows (animated height) */}
        <Animated.View style={{ height: animHeight, overflow: 'hidden' }}>
          {visibleRows.map((week, rowIdx) => (
            <View key={rowIdx} style={[styles.weekRow, { height: CELL_HEIGHT }]}>
              {week.map((day) => {
                const dayKey = toISODateString(day);
                const isCurrentMonth =
                  day.getMonth() === currentDate.getMonth();
                const today = isToday(day);
                const selected = isSameDay(day, currentDate);
                const dots = eventColorsByDay.get(dayKey) ?? [];

                return (
                  <Pressable
                    key={dayKey}
                    style={styles.dayCell}
                    onPress={() => onDaySelect(day)}
                    accessibilityLabel={formatDateCN(day)}
                  >
                    <View
                      style={[
                        styles.dayNumContainer,
                        today && { backgroundColor: colors.primary },
                        selected && !today && {
                          backgroundColor: colors.primary + '22',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          {
                            color: !isCurrentMonth
                              ? colors.textSecondary
                              : today
                              ? '#ffffff'
                              : selected
                              ? colors.primary
                              : colors.text,
                            fontWeight: selected ? '700' : '400',
                          },
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </View>

                    {/* Event dots */}
                    <View style={styles.dotsRow}>
                      {dots.slice(0, 3).map((color, di) => (
                        <View
                          key={di}
                          style={[styles.eventDot, { backgroundColor: color }]}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Animated.View>

        {/* Drag handle */}
        <View
          {...panResponder.panHandlers}
          style={[styles.dragHandle, { borderTopColor: colors.border }]}
        >
          <Pressable
            onPress={() => toggleExpanded(!expanded)}
            style={styles.dragHandleBtn}
            accessibilityLabel={expanded ? '收起日历' : '展开日历'}
          >
            <View
              style={[
                styles.dragHandleBar,
                { backgroundColor: colors.border },
              ]}
            />
            <Text
              style={[styles.dragHint, { color: colors.textSecondary }]}
            >
              {expanded ? '▲ 收起' : '▼ 展开'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Selected day event list */}
      <ScrollView
        style={styles.eventList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Day label */}
        <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.listHeaderText, { color: colors.text }]}>
            {isToday(currentDate) ? '今天 · ' : ''}
            {formatDateCN(currentDate)}
          </Text>
        </View>

        {selectedDayItems.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            无日程
          </Text>
        ) : (
          selectedDayItems.map(({ item, color }, idx) => (
            <EventItem
              key={`${item.id}-${idx}`}
              item={item}
              color={color}
            />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  calendarCard: {
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  dayNumContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 14,
    lineHeight: 17,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
    height: 6,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dragHandle: {
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  dragHandleBtn: {
    paddingVertical: 6,
    alignItems: 'center',
    width: SCREEN_WIDTH,
  },
  dragHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  dragHint: {
    fontSize: 11,
  },
  eventList: {
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
  },
});
