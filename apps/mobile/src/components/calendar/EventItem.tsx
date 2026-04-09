// ============================================================
// EventItem – event/todo row in list views
// ============================================================

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { Event, Todo } from '@project-calendar/shared';
import { formatTime } from '@project-calendar/shared';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EventItemProps {
  /** The item to display */
  item: Event | Todo;
  /** Calendar color for this item */
  color: string;
  onPress?: () => void;
}

function isTodo(item: Event | Todo): item is Todo {
  return 'is_completed' in item;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventItem({
  item,
  color,
  onPress,
}: EventItemProps): React.JSX.Element {
  const { colors } = useTheme();

  let timeText = '';
  if (isTodo(item)) {
    if (item.due_time) {
      const [h, m] = item.due_time.split(':');
      const d = new Date();
      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      timeText = formatTime(d);
    } else {
      timeText = '全天';
    }
  } else {
    if (item.is_all_day) {
      timeText = '全天';
    } else {
      timeText = formatTime(new Date(item.start_time));
    }
  }

  const isCompleted = isTodo(item) && item.is_completed;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.bgSecondary : 'transparent' },
      ]}
      onPress={onPress}
      accessibilityLabel={item.title}
    >
      {/* Left accent border */}
      <View style={[styles.accentBar, { backgroundColor: color }]} />

      {/* Color indicator / checkbox */}
      <View style={styles.leftCol}>
        {isTodo(item) ? (
          <View
            style={[
              styles.checkbox,
              {
                borderColor: color,
                backgroundColor: isCompleted ? color : 'transparent',
              },
            ]}
          >
            {isCompleted && <Text style={styles.checkmark}>&#10003;</Text>}
          </View>
        ) : (
          <View style={[styles.dot, { backgroundColor: color }]} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              textDecorationLine: isCompleted ? 'line-through' : 'none',
              opacity: isCompleted ? 0.5 : 1,
            },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {timeText ? (
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {timeText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 10,
  },
  leftCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  content: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 15,
  },
  time: {
    fontSize: 12,
    marginTop: 1,
  },
});
