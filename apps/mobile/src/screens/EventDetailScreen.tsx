// ============================================================
// EventDetailScreen – full event detail view with edit/delete
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../hooks/useTheme';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  getEvent,
  getCalendars,
  getRemindersForEvent,
  softDeleteEvent,
} from '@project-calendar/shared';
import type { CalendarRow, EventRow, ReminderRow } from '@project-calendar/shared';
import { getSupabaseClientOrNull, SUPABASE_CONFIG_ERROR } from '../lib/supabase';
import { syncWidgetData } from '../widget/widgetSync';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventDetailNavProp = StackNavigationProp<RootStackParamList, 'EventDetail'>;
type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;

// ---------------------------------------------------------------------------
// Reminder offset label
// ---------------------------------------------------------------------------

function reminderLabel(offsetMinutes: number): string {
  if (offsetMinutes < 60) return `提前${offsetMinutes}分钟`;
  if (offsetMinutes < 1440) return `提前${offsetMinutes / 60}小时`;
  return `提前${offsetMinutes / 1440}天`;
}

// ---------------------------------------------------------------------------
// Date/time formatting
// ---------------------------------------------------------------------------

function formatEventTime(event: EventRow): string {
  if (event.is_all_day) {
    const d = new Date(event.start_time);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 全天`;
  }

  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const datePart = `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;
  const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

  if (sameDay) {
    return `${datePart} ${startTime}–${endTime}`;
  }
  const endDatePart = `${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
  return `${datePart} ${startTime} – ${endDatePart} ${endTime}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventDetailScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation<EventDetailNavProp>();
  const route = useRoute<EventDetailRouteProp>();
  const { eventId } = route.params;
  const supabase = getSupabaseClientOrNull();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [calendar, setCalendar] = useState<CalendarRow | null>(null);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      Alert.alert('演示模式', `${SUPABASE_CONFIG_ERROR}\n\n演示模式下暂不支持查看云端详情。`, [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    void (async () => {
      setLoading(true);
      const [evResult, calsResult, remResult] = await Promise.all([
        getEvent(supabase, eventId),
        getCalendars(supabase),
        getRemindersForEvent(supabase, eventId),
      ]);
      if (evResult.data) {
        setEvent(evResult.data);
        if (calsResult.data) {
          const cal = calsResult.data.find((c) => c.id === evResult.data!.calendar_id) ?? null;
          setCalendar(cal);
        }
      }
      if (remResult.data) {
        setReminders(remResult.data);
      }
      setLoading(false);
    })();
  }, [eventId, navigation, supabase]);

  const handleEdit = useCallback(() => {
    navigation.navigate('EventForm', { eventId });
  }, [navigation, eventId]);

  const handleDelete = useCallback(() => {
    if (!supabase) {
      Alert.alert('演示模式', '当前预览模式不支持删除日程。');
      return;
    }
    Alert.alert(
      '删除日程',
      '确定要删除此日程吗？此操作可以在删除后5秒内撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              const result = await softDeleteEvent(supabase, eventId);
              setDeleting(false);
              if (result.error) {
                Alert.alert('删除失败', result.error);
                return;
              }
              await syncWidgetData().catch((error: unknown) => {
                console.warn('widget sync failed after event delete', error);
              });
              navigation.goBack();
            })();
          },
        },
      ],
    );
  }, [eventId, navigation, supabase]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>日程不存在</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const accentColor = event.color ?? calendar?.color ?? colors.primary;

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>← 返回</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.actionBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.actionBtn, { borderColor: colors.danger }]}
            disabled={deleting}
          >
            {deleting
              ? <ActivityIndicator size="small" color={colors.danger} />
              : <Text style={[styles.actionBtnText, { color: colors.danger }]}>删除</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Color accent bar – full width, 4px */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>

        {/* Time */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>&#128197;</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>{formatEventTime(event)}</Text>
        </View>

        {/* Location */}
        {event.location ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>&#128205;</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{event.location}</Text>
          </View>
        ) : null}

        {/* Description */}
        {event.description ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>&#128221;</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{event.description}</Text>
          </View>
        ) : null}

        {/* Calendar */}
        {calendar ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>&#128197;</Text>
            <View style={[styles.calDot, { backgroundColor: calendar.color }]} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{calendar.name}</Text>
          </View>
        ) : null}

        {/* Reminders */}
        {reminders.length > 0 ? (
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🔔</Text>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>提醒</Text>
            </View>
            {reminders.map((rem) => (
              <View key={rem.id} style={styles.reminderItem}>
                <Text style={[styles.reminderText, { color: colors.text }]}>
                  {reminderLabel(rem.offset_minutes)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorMsg: {
    fontSize: 16,
    marginBottom: 12,
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    minWidth: 52,
  },
  headerBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  accentBar: {
    height: 4,
    marginHorizontal: -20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoIcon: {
    fontSize: 18,
    width: 28,
  },
  infoText: {
    fontSize: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: 8,
  },
  calDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  reminderItem: {
    paddingLeft: 28,
    marginBottom: 6,
  },
  reminderText: {
    fontSize: 14,
  },
  bottomPad: {
    height: 40,
  },
});
