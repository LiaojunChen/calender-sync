// ============================================================
// EventFormScreen – full event creation / editing form
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../hooks/useTheme';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  createEvent,
  updateEvent,
  getEvent,
  getCalendars,
  setRemindersForEvent,
  getRemindersForEvent,
  validateEvent,
} from '@project-calendar/shared';
import type { CalendarRow, EventInsert, EventUpdate } from '@project-calendar/shared';
import { getSupabaseClientOrNull, SUPABASE_CONFIG_ERROR } from '../lib/supabase';
import { DEFAULT_REMINDER_OFFSETS } from '../notifications/scheduler';
import { syncWidgetData } from '../widget/widgetSync';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventFormNavProp = StackNavigationProp<RootStackParamList, 'EventForm'>;
type EventFormRouteProp = RouteProp<RootStackParamList, 'EventForm'>;

// ---------------------------------------------------------------------------
// Color options
// ---------------------------------------------------------------------------

const COLOR_OPTIONS = [
  '#1a73e8', // Google Blue
  '#e91e63', // Pink
  '#34a853', // Green
  '#ff9800', // Orange
  '#9c27b0', // Purple
  '#00bcd4', // Cyan
  '#f44336', // Red
  '#795548', // Brown
  '#607d8b', // Blue Grey
  '#ff5722', // Deep Orange
  '#8bc34a', // Light Green
  '#ffc107', // Amber
];

// ---------------------------------------------------------------------------
// Reminder offset options
// ---------------------------------------------------------------------------

const REMINDER_OPTIONS: { label: string; value: number }[] = [
  { label: '5分钟前', value: 5 },
  { label: '10分钟前', value: 10 },
  { label: '30分钟前', value: 30 },
  { label: '1小时前', value: 60 },
  { label: '1天前', value: 1440 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateStr(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeStr(isoString: string): string {
  const d = new Date(isoString);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/** Parse a "YYYY-MM-DD" and "HH:mm" pair into an ISO string. Returns null on error. */
function parseDatetime(dateStr: string, timeStr: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!dateMatch || !timeMatch) return null;
  const d = new Date(
    parseInt(dateMatch[1]!, 10),
    parseInt(dateMatch[2]!, 10) - 1,
    parseInt(dateMatch[3]!, 10),
    parseInt(timeMatch[1]!, 10),
    parseInt(timeMatch[2]!, 10),
    0,
    0,
  );
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function defaultStartIso(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

function defaultEndIso(startIso: string): string {
  const d = new Date(startIso);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventFormScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation<EventFormNavProp>();
  const route = useRoute<EventFormRouteProp>();
  const eventId = route.params?.eventId;
  const isEditing = Boolean(eventId);
  const supabase = getSupabaseClientOrNull();

  // ---- form state ----
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDateStr, setStartDateStr] = useState(() => formatDateStr(defaultStartIso()));
  const [startTimeStr, setStartTimeStr] = useState(() => formatTimeStr(defaultStartIso()));
  const [endDateStr, setEndDateStr] = useState(() => {
    const start = defaultStartIso();
    return formatDateStr(defaultEndIso(start));
  });
  const [endTimeStr, setEndTimeStr] = useState(() => {
    const start = defaultStartIso();
    return formatTimeStr(defaultEndIso(start));
  });
  const [calendarId, setCalendarId] = useState('');
  const [color, setColor] = useState<string | null>(null);
  // New events start with default reminder offsets; editing overwrites from DB
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(
    isEditing ? [] : [...DEFAULT_REMINDER_OFFSETS],
  );

  // ---- meta state ----
  const [calendars, setCalendars] = useState<CalendarRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---- load calendars ----
  useEffect(() => {
    if (!supabase) {
      Alert.alert('演示模式', `${SUPABASE_CONFIG_ERROR}\n\n演示模式下暂不支持新建或编辑日程。`, [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    void (async () => {
      setLoading(true);
      const result = await getCalendars(supabase);
      if (result.data) {
        setCalendars(result.data);
        if (!calendarId && result.data.length > 0) {
          const def = result.data.find((c) => c.is_default) ?? result.data[0];
          if (def) setCalendarId(def.id);
        }
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarId, navigation, supabase]);

  // ---- load event if editing ----
  useEffect(() => {
    if (!eventId || !supabase) return;
    void (async () => {
      setLoading(true);
      const [evResult, remResult] = await Promise.all([
        getEvent(supabase, eventId),
        getRemindersForEvent(supabase, eventId),
      ]);
      if (evResult.data) {
        const ev = evResult.data;
        setTitle(ev.title);
        setDescription(ev.description ?? '');
        setLocation(ev.location ?? '');
        setIsAllDay(ev.is_all_day);
        setStartDateStr(formatDateStr(ev.start_time));
        setStartTimeStr(formatTimeStr(ev.start_time));
        setEndDateStr(formatDateStr(ev.end_time));
        setEndTimeStr(formatTimeStr(ev.end_time));
        setCalendarId(ev.calendar_id);
        setColor(ev.color ?? null);
      }
      if (remResult.data) {
        setReminderOffsets(remResult.data.map((r) => r.offset_minutes));
      }
      setLoading(false);
    })();
  }, [eventId, supabase]);

  // ---- save ----
  const handleSave = useCallback(async () => {
    if (!supabase) {
      Alert.alert('演示模式', '当前预览模式不支持保存日程。');
      return;
    }

    // Build datetime strings
    const startIso = isAllDay
      ? `${startDateStr}T00:00:00.000Z`
      : (parseDatetime(startDateStr, startTimeStr) ?? '');
    const endIso = isAllDay
      ? `${endDateStr}T23:59:59.000Z`
      : (parseDatetime(endDateStr, endTimeStr) ?? '');

    // Validate
    const validation = validateEvent({
      title,
      start_time: startIso,
      end_time: endIso,
      calendar_id: calendarId,
      is_all_day: isAllDay,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      let savedEventId = eventId;

      if (isEditing && eventId) {
        const updates: EventUpdate = {
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          start_time: startIso,
          end_time: endIso,
          is_all_day: isAllDay,
          calendar_id: calendarId,
          color: color ?? undefined,
        };
        const result = await updateEvent(supabase, eventId, updates);
        if (result.error) {
          Alert.alert('保存失败', result.error);
          setSaving(false);
          return;
        }
      } else {
        const insert: EventInsert = {
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          start_time: startIso,
          end_time: endIso,
          is_all_day: isAllDay,
          calendar_id: calendarId,
          color: color ?? undefined,
          user_id: '', // filled by RLS / trigger
        };
        const result = await createEvent(supabase, insert);
        if (result.error || !result.data) {
          Alert.alert('保存失败', result.error ?? '未知错误');
          setSaving(false);
          return;
        }
        savedEventId = result.data.id;
      }

      // Save reminders
      if (savedEventId) {
        await setRemindersForEvent(supabase, savedEventId, reminderOffsets);
      }

      await syncWidgetData().catch((error: unknown) => {
        console.warn('widget sync failed after event save', error);
      });

      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }, [
    isAllDay,
    startDateStr,
    startTimeStr,
    endDateStr,
    endTimeStr,
    title,
    calendarId,
    isEditing,
    eventId,
    description,
    location,
    color,
    reminderOffsets,
    navigation,
    supabase,
  ]);

  const addReminder = useCallback(() => {
    // Add 10min if not already present, else first not-present option
    const available = REMINDER_OPTIONS.find(
      (o) => !reminderOffsets.includes(o.value),
    );
    if (available) {
      setReminderOffsets((prev) => [...prev, available.value]);
    }
  }, [reminderOffsets]);

  const removeReminder = useCallback((offset: number) => {
    setReminderOffsets((prev) => prev.filter((o) => o !== offset));
  }, []);

  const cycleReminder = useCallback((oldOffset: number) => {
    const currentIdx = REMINDER_OPTIONS.findIndex((o) => o.value === oldOffset);
    const nextIdx = (currentIdx + 1) % REMINDER_OPTIONS.length;
    const nextValue = REMINDER_OPTIONS[nextIdx]!.value;
    // Avoid duplicates
    if (reminderOffsets.includes(nextValue)) return;
    setReminderOffsets((prev) =>
      prev.map((o) => (o === oldOffset ? nextValue : o)),
    );
  }, [reminderOffsets]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>取消</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? '编辑日程' : '新建日程'}
        </Text>
        <TouchableOpacity
          onPress={() => { void handleSave(); }}
          style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Text style={styles.saveHeaderBtnText}>保存</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>标题 *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: errors['title'] ? colors.danger : colors.border, backgroundColor: colors.surface }]}
            value={title}
            onChangeText={setTitle}
            placeholder="添加标题"
            placeholderTextColor={colors.textSecondary}
          />
          {errors['title'] ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors['title']}</Text> : null}
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>描述</Text>
          <TextInput
            style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={description}
            onChangeText={setDescription}
            placeholder="添加描述"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Location */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>地点</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={location}
            onChangeText={setLocation}
            placeholder="添加地点"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* All-day toggle */}
        <View style={[styles.row, { borderColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>全天</Text>
          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.background}
          />
        </View>

        {/* Start date/time */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>开始</Text>
          <View style={styles.dateTimeRow}>
            <TextInput
              style={[styles.dateInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={startDateStr}
              onChangeText={setStartDateStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
            {!isAllDay && (
              <TextInput
                style={[styles.timeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={startTimeStr}
                onChangeText={setStartTimeStr}
                placeholder="HH:mm"
                placeholderTextColor={colors.textSecondary}
              />
            )}
          </View>
        </View>

        {/* End date/time */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>结束</Text>
          <View style={styles.dateTimeRow}>
            <TextInput
              style={[styles.dateInput, { color: colors.text, borderColor: errors['end_time'] ? colors.danger : colors.border, backgroundColor: colors.surface }]}
              value={endDateStr}
              onChangeText={setEndDateStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
            {!isAllDay && (
              <TextInput
                style={[styles.timeInput, { color: colors.text, borderColor: errors['end_time'] ? colors.danger : colors.border, backgroundColor: colors.surface }]}
                value={endTimeStr}
                onChangeText={setEndTimeStr}
                placeholder="HH:mm"
                placeholderTextColor={colors.textSecondary}
              />
            )}
          </View>
          {errors['end_time'] ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors['end_time']}</Text> : null}
          {errors['time'] ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors['time']}</Text> : null}
        </View>

        {/* Calendar picker */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>日历 *</Text>
          {errors['calendar_id'] ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors['calendar_id']}</Text> : null}
          <View style={styles.calendarList}>
            {calendars.map((cal) => (
              <TouchableOpacity
                key={cal.id}
                style={[
                  styles.calendarOption,
                  {
                    borderColor: calendarId === cal.id ? cal.color : colors.border,
                    backgroundColor: calendarId === cal.id ? cal.color + '20' : colors.surface,
                  },
                ]}
                onPress={() => setCalendarId(cal.id)}
              >
                <View style={[styles.calDot, { backgroundColor: cal.color }]} />
                <Text style={[styles.calName, { color: colors.text }]}>{cal.name}</Text>
                {calendarId === cal.id && (
                  <Text style={{ color: cal.color, marginLeft: 4 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color picker */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>颜色</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
            {/* "默认" option (null color) */}
            <TouchableOpacity
              style={[
                styles.colorCircle,
                {
                  backgroundColor: colors.border,
                  borderWidth: color === null ? 3 : 1,
                  borderColor: color === null ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setColor(null)}
            >
              {color === null && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
            {COLOR_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorCircle,
                  {
                    backgroundColor: c,
                    borderWidth: color === c ? 3 : 1,
                    borderColor: color === c ? colors.text : 'transparent',
                  },
                ]}
                onPress={() => setColor(c)}
              >
                {color === c && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Reminders */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>提醒</Text>
          {reminderOffsets.map((offset) => {
            const opt = REMINDER_OPTIONS.find((o) => o.value === offset);
            const label = opt ? opt.label : `${offset}分钟前`;
            return (
              <View key={offset} style={[styles.reminderRow, { borderColor: colors.border }]}>
                <TouchableOpacity onPress={() => cycleReminder(offset)} style={styles.reminderLabel}>
                  <Text style={[styles.reminderText, { color: colors.text }]}>{label}</Text>
                  <Text style={[styles.reminderHint, { color: colors.textSecondary }]}>（点击切换）</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeReminder(offset)} style={styles.reminderDelete}>
                  <Text style={{ color: colors.danger, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          {reminderOffsets.length < REMINDER_OPTIONS.length && (
            <TouchableOpacity
              style={[styles.addReminderBtn, { borderColor: colors.primary }]}
              onPress={addReminder}
            >
              <Text style={[styles.addReminderText, { color: colors.primary }]}>+ 添加提醒</Text>
            </TouchableOpacity>
          )}
        </View>

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
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  saveHeaderBtn: {
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
  },
  multilineInput: {
    height: undefined,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  rowLabel: {
    fontSize: 15,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
  },
  timeInput: {
    flex: 2,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    textAlign: 'center',
  },
  calendarList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  calDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  calName: {
    fontSize: 14,
  },
  colorScroll: {
    flexDirection: 'row',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reminderLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderText: {
    fontSize: 15,
  },
  reminderHint: {
    fontSize: 11,
    marginLeft: 6,
  },
  reminderDelete: {
    padding: 4,
  },
  addReminderBtn: {
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    paddingVertical: 10,
    alignItems: 'center',
  },
  addReminderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPad: {
    height: 40,
  },
});
