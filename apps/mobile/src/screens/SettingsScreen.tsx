// ============================================================
// SettingsScreen – full settings (Task 15)
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppSettings } from '../hooks/useAppSettings';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import type { ThemeMode } from '../components/common/ThemeProvider';

// ============================================================
// Constants
// ============================================================

type ViewType = 'day' | 'week' | 'month' | 'agenda';
type WeekStart = 'monday' | 'sunday';
type AppTheme = 'light' | 'dark' | 'system';

const VIEW_OPTIONS: { label: string; value: ViewType }[] = [
  { label: '日视图', value: 'day' },
  { label: '周视图', value: 'week' },
  { label: '月视图', value: 'month' },
  { label: '议程', value: 'agenda' },
];

const WEEK_START_OPTIONS: { label: string; value: WeekStart }[] = [
  { label: '星期一', value: 'monday' },
  { label: '星期日', value: 'sunday' },
];

const DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: '15 分钟', value: 15 },
  { label: '30 分钟', value: 30 },
  { label: '45 分钟', value: 45 },
  { label: '60 分钟', value: 60 },
  { label: '90 分钟', value: 90 },
  { label: '120 分钟', value: 120 },
];

const REMINDER_OPTIONS: { label: string; value: number }[] = [
  { label: '5 分钟前', value: 5 },
  { label: '10 分钟前', value: 10 },
  { label: '15 分钟前', value: 15 },
  { label: '30 分钟前', value: 30 },
  { label: '1 小时前', value: 60 },
  { label: '2 小时前', value: 120 },
  { label: '1 天前', value: 1440 },
];

const THEME_OPTIONS: { label: string; value: AppTheme }[] = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
];

function formatReminderLabel(minutes: number): string {
  const found = REMINDER_OPTIONS.find((o) => o.value === minutes);
  if (found) return found.label;
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes % 1440 === 0) return `${minutes / 1440} 天前`;
  if (minutes % 60 === 0) return `${minutes / 60} 小时前`;
  return `${minutes} 分钟前`;
}

// ============================================================
// Subcomponents
// ============================================================

function SectionLabel({ label, colors }: { label: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
      {label}
    </Text>
  );
}

interface RadioGroupProps<T extends string | number> {
  options: { label: string; value: T }[];
  value: T;
  onSelect: (val: T) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  wrap?: boolean;
}

function RadioGroup<T extends string | number>({
  options,
  value,
  onSelect,
  colors,
  wrap,
}: RadioGroupProps<T>) {
  return (
    <View style={[styles.radioGroup, wrap && styles.radioGroupWrap]}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={String(opt.value)}
            style={[
              styles.radioOption,
              {
                backgroundColor: selected ? colors.accentLight : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text
              style={[
                styles.radioOptionText,
                { color: selected ? colors.primary : colors.text, fontWeight: selected ? '600' : '400' },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================
// Main Screen
// ============================================================

export default function SettingsScreen(): React.JSX.Element {
  const { colors, mode, setMode } = useTheme();
  const { settings, isLoaded, saveSettings } = useAppSettings();
  const { signOut, status, isDemoMode } = useAuth();

  // Settings state (defaults)
  const [defaultView, setDefaultView] = useState<ViewType>(settings.default_view);
  const [weekStartDay, setWeekStartDay] = useState<WeekStart>(settings.week_start_day);
  const [defaultDuration, setDefaultDuration] = useState<number>(settings.default_event_duration);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(settings.default_reminder_offsets);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    setDefaultView(settings.default_view);
    setWeekStartDay(settings.week_start_day);
    setDefaultDuration(settings.default_event_duration);
    setReminderOffsets(settings.default_reminder_offsets);
  }, [isLoaded, settings]);

  const handleAddReminder = useCallback((value: number) => {
    setReminderOffsets((prev) => {
      if (prev.includes(value)) return prev;
      return [...prev, value].sort((a, b) => a - b);
    });
  }, []);

  const handleRemoveReminder = useCallback((value: number) => {
    setReminderOffsets((prev) => prev.filter((v) => v !== value));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSavedMsg('');

    // Apply theme immediately
    setMode(mode as ThemeMode);

    const result = await saveSettings({
      default_view: defaultView,
      week_start_day: weekStartDay,
      default_event_duration: defaultDuration,
      theme: mode,
      default_reminder_offsets: reminderOffsets,
    });

    if (!result.ok) {
      Alert.alert('保存失败', result.error ?? '请稍后重试');
      setSaving(false);
      return;
    }

    setSavedMsg(status === 'authenticated' && !isDemoMode ? '已保存' : '已保存（本地）');

    setSaving(false);
    setTimeout(() => setSavedMsg(''), 2000);
  }, [
    defaultDuration,
    defaultView,
    isDemoMode,
    mode,
    reminderOffsets,
    saveSettings,
    setMode,
    status,
    weekStartDay,
  ]);

  if (!isLoaded) {
    return (
      <View style={[styles.loadingState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* Default view */}
      <SectionLabel label="默认视图" colors={colors} />
      <RadioGroup
        options={VIEW_OPTIONS}
        value={defaultView}
        onSelect={setDefaultView}
        colors={colors}
        wrap
      />

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* Week start */}
      <SectionLabel label="周起始日" colors={colors} />
      <RadioGroup
        options={WEEK_START_OPTIONS}
        value={weekStartDay}
        onSelect={setWeekStartDay}
        colors={colors}
      />

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* Default duration */}
      <SectionLabel label="默认时长" colors={colors} />
      <RadioGroup
        options={DURATION_OPTIONS}
        value={defaultDuration}
        onSelect={setDefaultDuration}
        colors={colors}
        wrap
      />

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* Default reminders */}
      <SectionLabel label="默认提醒" colors={colors} />
      <View style={styles.reminderContainer}>
        {reminderOffsets.map((val) => (
          <View key={val} style={[styles.reminderChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reminderChipText, { color: colors.text }]}>
              {formatReminderLabel(val)}
            </Text>
            <Pressable
              style={styles.reminderRemoveBtn}
              onPress={() => handleRemoveReminder(val)}
              hitSlop={8}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 18 }}>×</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={[styles.addReminderLabel, { color: colors.textSecondary }]}>添加提醒：</Text>
      <View style={styles.radioGroupWrap}>
        {REMINDER_OPTIONS.filter((o) => !reminderOffsets.includes(o.value)).map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.addReminderBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleAddReminder(opt.value)}
          >
            <Text style={[styles.addReminderBtnText, { color: colors.primary }]}>
              + {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* Theme */}
      <SectionLabel label="主题" colors={colors} />
      <RadioGroup
        options={THEME_OPTIONS}
        value={mode as AppTheme}
        onSelect={(val) => setMode(val as ThemeMode)}
        colors={colors}
      />

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* Save button */}
      <View style={styles.saveRow}>
        {savedMsg ? (
          <Text style={[styles.savedMsg, { color: colors.primary }]}>{savedMsg}</Text>
        ) : null}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? '保存中...' : '保存设置'}</Text>
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* Logout */}
      <Pressable
        style={[styles.logoutBtn, { backgroundColor: colors.danger }]}
        onPress={() => {
          if (isDemoMode) {
            Alert.alert('演示模式', '当前为演示模式，无需退出登录。');
            return;
          }
          void signOut();
        }}
      >
        <Text style={styles.logoutText}>{isDemoMode ? '演示模式' : '退出登录'}</Text>
      </Pressable>
    </ScrollView>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  radioGroupWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  radioOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  radioOptionText: {
    fontSize: 14,
  },
  reminderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 6,
    gap: 4,
  },
  reminderChipText: {
    fontSize: 13,
  },
  reminderRemoveBtn: {
    padding: 2,
  },
  addReminderLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  addReminderBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  addReminderBtnText: {
    fontSize: 13,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedMsg: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutBtn: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
