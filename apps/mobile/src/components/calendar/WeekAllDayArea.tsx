import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  eventIntersectsDay,
  type Calendar,
  type Event,
} from '@project-calendar/shared';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';

interface WeekAllDayAreaProps {
  days: Date[];
  events: Event[];
  calendars: Calendar[];
}

interface EventRow {
  event: Event;
  startCol: number;
  endCol: number;
  row: number;
}

const BAR_HEIGHT = 28;
const BAR_GAP = 6;

function getEventNavigationId(event: Event): string {
  const recurringEvent = event as Event & { _recurringEventId?: string };
  return recurringEvent._recurringEventId ?? event.id;
}

export default function WeekAllDayArea({
  days,
  events,
  calendars,
}: WeekAllDayAreaProps): React.JSX.Element | null {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();

  const calendarMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    for (const calendar of calendars) {
      map.set(calendar.id, calendar);
    }
    return map;
  }, [calendars]);

  const rows = useMemo(() => {
    const laidOutRows: EventRow[] = [];
    const occupied: Array<Array<[number, number]>> = [];
    const sortedEvents = [...events].sort((a, b) => {
      const startDiff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      if (startDiff !== 0) {
        return startDiff;
      }
      return new Date(b.end_time).getTime() - new Date(a.end_time).getTime();
    });

    for (const event of sortedEvents) {
      const coveredColumns = days
        .map((day, index) => (eventIntersectsDay(event, day) ? index : -1))
        .filter((index) => index >= 0);

      if (coveredColumns.length === 0) {
        continue;
      }

      const startCol = coveredColumns[0]!;
      const endCol = coveredColumns[coveredColumns.length - 1]!;

      let row = 0;
      while (true) {
        if (!occupied[row]) {
          occupied[row] = [];
        }
        const hasConflict = occupied[row].some(
          ([occupiedStart, occupiedEnd]) =>
            startCol <= occupiedEnd && endCol >= occupiedStart,
        );
        if (!hasConflict) {
          occupied[row].push([startCol, endCol]);
          laidOutRows.push({ event, startCol, endCol, row });
          break;
        }
        row += 1;
      }
    }

    return laidOutRows;
  }, [days, events]);

  if (rows.length === 0) {
    return null;
  }

  const contentHeight =
    rows.reduce((maxRow, row) => Math.max(maxRow, row.row), 0) * (BAR_HEIGHT + BAR_GAP) +
    BAR_HEIGHT;

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>全天</Text>
      <View style={[styles.columns, { minHeight: contentHeight }]}>
        {days.map((day) => (
          <View
            key={day.toISOString()}
            style={[styles.columnGuide, { borderLeftColor: colors.borderLight }]}
          />
        ))}

        {rows.map(({ event, startCol, endCol, row }) => {
          const calendar = calendarMap.get(event.calendar_id);
          const backgroundColor = event.color ?? calendar?.color ?? colors.primary;
          return (
            <Pressable
              key={`${event.id}-${row}`}
              style={[
                styles.bar,
                {
                  top: row * (BAR_HEIGHT + BAR_GAP),
                  left: `${(startCol / days.length) * 100}%`,
                  width: `${((endCol - startCol + 1) / days.length) * 100}%`,
                  backgroundColor,
                },
              ]}
              onPress={() =>
                navigation.navigate('EventDetail', {
                  eventId: getEventNavigationId(event),
                })
              }
              accessibilityLabel={event.title}
            >
              <Text style={styles.barText} numberOfLines={1}>
                {event.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  label: {
    width: 48,
    paddingTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  columns: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
  },
  columnGuide: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    position: 'absolute',
    height: BAR_HEIGHT,
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  barText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
