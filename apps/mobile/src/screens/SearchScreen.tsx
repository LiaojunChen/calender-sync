// ============================================================
// SearchScreen – full-screen search for events and todos
// ============================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../hooks/useTheme';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Calendar, Event, Todo } from '@project-calendar/shared';

// ============================================================
// Types
// ============================================================

interface SearchProps {
  events?: Event[];
  todos?: Todo[];
  calendars?: Calendar[];
}

type NavProp = StackNavigationProp<RootStackParamList>;

// ============================================================
// Helpers
// ============================================================

function formatEventTime(event: Event): string {
  const start = new Date(event.start_time);
  if (event.is_all_day) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 全天`;
  }
  const end = new Date(event.end_time);
  const datePart = `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;
  const timePart = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}–${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  return `${datePart} ${timePart}`;
}

function formatTodoTime(todo: Todo): string {
  if (!todo.due_date) return '无截止日期';
  const d = new Date(todo.due_date);
  const datePart = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  if (todo.due_time) return `${datePart} ${todo.due_time.slice(0, 5)}`;
  return datePart;
}

function matchesQuery(text: string | null | undefined, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

// ============================================================
// SearchResult item
// ============================================================

interface SearchResult {
  id: string;
  kind: 'event' | 'todo';
  title: string;
  subtitle: string;
  color: string;
  date: Date | null;
  rawDate?: string; // ISO start_time for events
}

// ============================================================
// Component
// ============================================================

export default function SearchScreen({
  events = [],
  todos = [],
  calendars = [],
}: SearchProps): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const [query, setQuery] = useState('');

  // Build calendar color map
  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cal of calendars) {
      map.set(cal.id, cal.color);
    }
    return map;
  }, [calendars]);

  // Filter results
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim();
    if (!q) return [];

    const eventResults: SearchResult[] = events
      .filter(
        (ev) =>
          !ev.deleted_at &&
          (matchesQuery(ev.title, q) ||
            matchesQuery(ev.description, q) ||
            matchesQuery(ev.location, q)),
      )
      .map((ev) => ({
        id: `event-${ev.id}`,
        kind: 'event' as const,
        title: ev.title,
        subtitle: formatEventTime(ev),
        color: ev.color ?? calendarColorMap.get(ev.calendar_id) ?? '#1a73e8',
        date: new Date(ev.start_time),
        rawDate: ev.start_time,
      }));

    const todoResults: SearchResult[] = todos
      .filter(
        (todo) =>
          !todo.deleted_at &&
          (matchesQuery(todo.title, q) || matchesQuery(todo.description, q)),
      )
      .map((todo) => ({
        id: `todo-${todo.id}`,
        kind: 'todo' as const,
        title: todo.title,
        subtitle: formatTodoTime(todo),
        color: todo.color ?? calendarColorMap.get(todo.calendar_id) ?? '#1a73e8',
        date: todo.due_date ? new Date(todo.due_date) : null,
      }));

    const all = [...eventResults, ...todoResults];
    all.sort((a, b) => {
      const aTime = a.date?.getTime() ?? Infinity;
      const bTime = b.date?.getTime() ?? Infinity;
      return aTime - bTime;
    });

    return all.slice(0, 50);
  }, [query, events, todos, calendarColorMap]);

  const handleResultPress = useCallback(
    (_result: SearchResult) => {
      // Navigate back to the calendar – result data is shown in the list,
      // and tapping navigates back to the main screen.
      navigation.goBack();
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <Pressable
        style={({ pressed }) => [
          styles.resultItem,
          { backgroundColor: pressed ? colors.surface : colors.card },
        ]}
        onPress={() => handleResultPress(item)}
      >
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
        <View style={styles.resultInfo}>
          <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.resultMeta}>
            <View style={[styles.kindBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.kindBadgeText, { color: colors.textSecondary }]}>
                {item.kind === 'event' ? '事件' : '待办'}
              </Text>
            </View>
            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>
        </View>
      </Pressable>
    ),
    [colors, handleResultPress],
  );

  const keyExtractor = useCallback((item: SearchResult) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 20, color: colors.primary }}>{'←'}</Text>
        </Pressable>
        <TextInput
          style={[styles.searchInput, { color: colors.text, backgroundColor: colors.surface }]}
          placeholder="搜索事件和待办..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Results */}
      {query.trim() === '' ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            输入关键词搜索事件和待办
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            没有找到与 &ldquo;{query}&rdquo; 相关的结果
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kindBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  kindBadgeText: {
    fontSize: 11,
  },
  resultSubtitle: {
    fontSize: 12,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
