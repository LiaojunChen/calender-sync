// ============================================================
// TimeGrid – shared time grid base (used by DayView & WeekView)
// ============================================================

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { isSameDay, formatTime } from '@project-calendar/shared';
import type { Event, Calendar } from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const HOUR_HEIGHT = 48; // px per hour
const HOURS_IN_DAY = 24;
const TOTAL_HEIGHT = HOUR_HEIGHT * HOURS_IN_DAY;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeGridEvent {
  event: Event;
  calendar: Calendar;
}

export interface TimeGridProps {
  /** Array of day Date objects to render as columns */
  days: Date[];
  /** Events with their calendars */
  events: TimeGridEvent[];
  /** Current time – used for the red indicator */
  now: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minutes from midnight for a given Date */
function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Top offset in px */
function topForMinutes(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT;
}

/** Height in px for a duration in minutes */
function heightForDuration(minutes: number): number {
  return Math.max((minutes / 60) * HOUR_HEIGHT, 14); // min 14px
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TimeGrid({
  days,
  events,
  now,
}: TimeGridProps): React.JSX.Element {
  const { colors } = useTheme();
  const columnCount = days.length;

  // Group events by day index
  const eventsByDay = useMemo(() => {
    return days.map((day) =>
      events.filter((e) => {
        if (e.event.is_all_day) return false;
        const start = new Date(e.event.start_time);
        return isSameDay(start, day);
      }),
    );
  }, [days, events]);

  // Current-time line
  const nowMinutes = minutesFromMidnight(now);
  const nowTop = topForMinutes(nowMinutes);
  const showNowLine = days.some((d) => isSameDay(d, now));

  return (
    <View style={styles.root}>
      {/* Hour labels column */}
      <View style={[styles.hourLabels, { borderRightColor: colors.border }]}>
        {Array.from({ length: HOURS_IN_DAY }, (_, h) => (
          <View key={h} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
            {h > 0 && (
              <Text style={[styles.hourText, { color: colors.textSecondary }]}>
                {h < 10 ? `0${h}:00` : `${h}:00`}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Day columns */}
      <View style={styles.columns}>
        {days.map((day, colIdx) => (
          <View
            key={day.toISOString()}
            style={[
              styles.column,
              {
                borderRightColor: colors.border,
                borderRightWidth:
                  colIdx < columnCount - 1 ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            {/* Hour lines */}
            {Array.from({ length: HOURS_IN_DAY }, (_, h) => (
              <View
                key={h}
                style={[
                  styles.hourLine,
                  {
                    top: h * HOUR_HEIGHT,
                    borderTopColor: colors.border,
                  },
                ]}
              />
            ))}

            {/* Events */}
            {eventsByDay[colIdx].map((e) => {
              const start = new Date(e.event.start_time);
              const end = new Date(e.event.end_time);
              const startMin = minutesFromMidnight(start);
              const durationMin = Math.max(
                (end.getTime() - start.getTime()) / 60000,
                15,
              );
              const topPx = topForMinutes(startMin);
              const heightPx = heightForDuration(durationMin);
              const bgColor = (e.event.color ?? e.calendar.color) + 'cc'; // with alpha

              return (
                <View
                  key={e.event.id}
                  style={[
                    styles.eventBlock,
                    {
                      top: topPx,
                      height: heightPx,
                      backgroundColor: bgColor,
                      borderLeftColor: e.event.color ?? e.calendar.color,
                    },
                  ]}
                >
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {e.event.title}
                  </Text>
                  {durationMin >= 30 && (
                    <Text style={styles.eventTime}>
                      {formatTime(start)}
                    </Text>
                  )}
                </View>
              );
            })}

            {/* Current time line */}
            {showNowLine && isSameDay(day, now) && (
              <View style={[styles.nowLine, { top: nowTop }]}>
                <View style={styles.nowDot} />
                <View style={styles.nowBar} />
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// Expose for consumers to use when measuring scroll position
export { TOTAL_HEIGHT, topForMinutes, minutesFromMidnight };

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    height: TOTAL_HEIGHT,
  },
  hourLabels: {
    width: 48,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  hourRow: {
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingRight: 4,
    alignItems: 'flex-end',
  },
  hourText: {
    fontSize: 10,
    lineHeight: 12,
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    position: 'relative',
    height: TOTAL_HEIGHT,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  eventBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 3,
    borderLeftWidth: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  eventTitle: {
    fontSize: 11,
    color: '#202124',
    fontWeight: '500',
    lineHeight: 13,
  },
  eventTime: {
    fontSize: 10,
    color: '#202124',
    opacity: 0.8,
    lineHeight: 12,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea4335',
    marginLeft: -4,
  },
  nowBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#ea4335',
  },
});
