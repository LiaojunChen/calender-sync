// ============================================================
// TodoScreen – live todo list with completion toggle
// ============================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useAppData } from '../hooks/useAppData';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getSupabaseClientOrNull } from '../lib/supabase';
import { syncWidgetData } from '../widget/widgetSync';
import { toggleTodoCompleted, type Calendar, type Todo } from '@project-calendar/shared';

type TodoNavProp = StackNavigationProp<RootStackParamList>;

function formatDueLabel(todo: Todo): string {
  if (!todo.due_date) return '无截止日期';

  const [, month, day] = todo.due_date.split('-');
  const dateLabel = `${Number(month)}月${Number(day)}日`;
  return todo.due_time ? `${dateLabel} ${todo.due_time.slice(0, 5)}` : dateLabel;
}

function sortKeyForTodo(todo: Todo): string {
  if (!todo.due_date) {
    return '9999-12-31T23:59:59';
  }
  return `${todo.due_date}T${todo.due_time ?? '23:59:59'}`;
}

export default function TodoScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation<TodoNavProp>();
  const { isDemoMode } = useAuth();
  const supabase = getSupabaseClientOrNull();
  const {
    calendars,
    todos,
    loading,
    error,
    refresh,
  } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const calendarMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    for (const calendar of calendars) {
      map.set(calendar.id, calendar);
    }
    return map;
  }, [calendars]);

  const visibleTodos = useMemo(() => {
    return todos
      .filter((todo) => {
        if (todo.deleted_at) return false;
        const calendar = calendarMap.get(todo.calendar_id);
        return Boolean(calendar?.is_visible);
      })
      .sort((a, b) => {
        if (a.is_completed !== b.is_completed) {
          return Number(a.is_completed) - Number(b.is_completed);
        }
        return sortKeyForTodo(a).localeCompare(sortKeyForTodo(b));
      });
  }, [todos, calendarMap]);

  const pendingCount = visibleTodos.filter((todo) => !todo.is_completed).length;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void refresh()
      .catch(() => {
        // Screen renders hook error state.
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [refresh]);

  const handleTodoPress = useCallback((todo: Todo) => {
    if (isDemoMode) {
      Alert.alert('演示模式', '当前预览模式不支持编辑待办。');
      return;
    }
    navigation.navigate('TodoForm', { todoId: todo.id });
  }, [isDemoMode, navigation]);

  const handleToggleCompleted = useCallback(async (todo: Todo) => {
    if (!supabase || isDemoMode) {
      Alert.alert('演示模式', '当前预览模式不支持修改待办状态。');
      return;
    }

    setUpdatingId(todo.id);
    try {
      const result = await toggleTodoCompleted(supabase, todo.id, !todo.is_completed);
      if (result.error) {
        Alert.alert('更新失败', result.error);
        return;
      }

      await refresh().catch(() => {
        // Screen renders hook error state.
      });
      await syncWidgetData().catch((syncError: unknown) => {
        console.warn('widget sync failed after todo toggle', syncError);
      });
    } finally {
      setUpdatingId(null);
    }
  }, [isDemoMode, refresh, supabase]);

  const renderItem = useCallback(({ item }: { item: Todo }) => {
    const calendar = calendarMap.get(item.calendar_id);
    const accentColor = item.color ?? calendar?.color ?? colors.primary;
    const metaText = `${calendar?.name ?? '默认日历'} · ${formatDueLabel(item)}`;

    return (
      <View
        style={[
          styles.todoCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.checkbox,
            {
              borderColor: accentColor,
              backgroundColor: item.is_completed ? accentColor : 'transparent',
            },
          ]}
          onPress={() => handleToggleCompleted(item)}
          accessibilityLabel={item.is_completed ? '标记为未完成' : '标记为已完成'}
        >
          {updatingId === item.id ? (
            <ActivityIndicator size="small" color={item.is_completed ? '#ffffff' : accentColor} />
          ) : item.is_completed ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : null}
        </Pressable>

        <Pressable style={styles.todoContent} onPress={() => handleTodoPress(item)}>
          <Text
            style={[
              styles.todoTitle,
              {
                color: colors.text,
                opacity: item.is_completed ? 0.55 : 1,
                textDecorationLine: item.is_completed ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.todoMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {metaText}
          </Text>
        </Pressable>
      </View>
    );
  }, [calendarMap, colors, handleTodoPress, handleToggleCompleted, updatingId]);

  if (loading && visibleTodos.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.danger }]}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={visibleTodos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.summary}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              待完成 {pendingCount} 项
            </Text>
            <Text style={[styles.summarySub, { color: colors.textSecondary }]}>
              已同步当前可见日历中的待办事项
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无待办</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              当前筛选范围内没有待办事项。
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
  },
  summary: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  summarySub: {
    marginTop: 4,
    fontSize: 13,
  },
  todoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 14,
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  todoMeta: {
    marginTop: 4,
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 72,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
  },
});
