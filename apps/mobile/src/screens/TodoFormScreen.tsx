// ============================================================
// TodoFormScreen – full todo creation / editing form
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
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
  createTodo,
  updateTodo,
  getTodo,
  getCalendars,
  setRemindersForTodo,
  getRemindersForTodo,
  validateTodo,
} from '@project-calendar/shared';
import type { CalendarRow, TodoInsert, TodoUpdate } from '@project-calendar/shared';
import { getSupabaseClientOrNull, SUPABASE_CONFIG_ERROR } from '../lib/supabase';
import { DEFAULT_REMINDER_OFFSETS } from '../notifications/scheduler';
import { syncWidgetData } from '../widget/widgetSync';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TodoFormNavProp = StackNavigationProp<RootStackParamList, 'TodoForm'>;
type TodoFormRouteProp = RouteProp<RootStackParamList, 'TodoForm'>;

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
// Component
// ---------------------------------------------------------------------------

export default function TodoFormScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation<TodoFormNavProp>();
  const route = useRoute<TodoFormRouteProp>();
  const todoId = route.params?.todoId;
  const isEditing = Boolean(todoId);
  const supabase = getSupabaseClientOrNull();

  // ---- form state ----
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [calendarId, setCalendarId] = useState('');
  // New todos start with default reminder offsets; editing overwrites from DB
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
      Alert.alert('演示模式', `${SUPABASE_CONFIG_ERROR}\n\n演示模式下暂不支持新建或编辑待办。`, [
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

  // ---- load todo if editing ----
  useEffect(() => {
    if (!todoId || !supabase) return;
    void (async () => {
      setLoading(true);
      const [todoResult, remResult] = await Promise.all([
        getTodo(supabase, todoId),
        getRemindersForTodo(supabase, todoId),
      ]);
      if (todoResult.data) {
        const td = todoResult.data;
        setTitle(td.title);
        setDescription(td.description ?? '');
        setDueDate(td.due_date ?? '');
        setDueTime(td.due_time ?? '');
        setCalendarId(td.calendar_id);
      }
      if (remResult.data) {
        setReminderOffsets(remResult.data.map((r) => r.offset_minutes));
      }
      setLoading(false);
    })();
  }, [todoId, supabase]);

  // ---- save ----
  const handleSave = useCallback(async () => {
    if (!supabase) {
      Alert.alert('演示模式', '当前预览模式不支持保存待办。');
      return;
    }

    // Validate
    const validation = validateTodo({
      title,
      calendar_id: calendarId,
      due_date: dueDate || null,
      due_time: dueTime || null,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      let savedTodoId = todoId;

      if (isEditing && todoId) {
        const updates: TodoUpdate = {
          title: title.trim(),
          description: description.trim() || undefined,
          due_date: dueDate.trim() || undefined,
          due_time: dueTime.trim() || undefined,
          calendar_id: calendarId,
        };
        const result = await updateTodo(supabase, todoId, updates);
        if (result.error) {
          Alert.alert('保存失败', result.error);
          setSaving(false);
          return;
        }
      } else {
        const insert: TodoInsert = {
          title: title.trim(),
          description: description.trim() || undefined,
          due_date: dueDate.trim() || undefined,
          due_time: dueTime.trim() || undefined,
          calendar_id: calendarId,
          user_id: '', // filled by RLS / trigger
          is_completed: false,
        };
        const result = await createTodo(supabase, insert);
        if (result.error || !result.data) {
          Alert.alert('保存失败', result.error ?? '未知错误');
          setSaving(false);
          return;
        }
        savedTodoId = result.data.id;
      }

      // Save reminders
      if (savedTodoId) {
        await setRemindersForTodo(supabase, savedTodoId, reminderOffsets);
      }

      await syncWidgetData().catch((error: unknown) => {
        console.warn('widget sync failed after todo save', error);
      });

      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }, [
    title,
    calendarId,
    dueDate,
    dueTime,
    isEditing,
    todoId,
    description,
    reminderOffsets,
    navigation,
    supabase,
  ]);

  const addReminder = useCallback(() => {
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
          {isEditing ? '编辑待办' : '新建待办'}
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

        {/* Due date */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>截止日期</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: errors['due_date'] ? colors.danger : colors.border, backgroundColor: colors.surface }]}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD（可选）"
            placeholderTextColor={colors.textSecondary}
          />
          {errors['due_date'] ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors['due_date']}</Text> : null}
        </View>

        {/* Due time */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>截止时间</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={dueTime}
            onChangeText={setDueTime}
            placeholder="HH:mm（可选，需先填写截止日期）"
            placeholderTextColor={colors.textSecondary}
          />
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
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
