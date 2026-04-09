// ============================================================
// SettingsScreen – placeholder (implemented in Task 15)
// ============================================================

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import type { ThemeMode } from '../components/common/ThemeProvider';

export default function SettingsScreen(): React.JSX.Element {
  const { colors, mode, setMode } = useTheme();
  const { signOut } = useAuth();

  const modes: { label: string; value: ThemeMode }[] = [
    { label: '浅色', value: 'light' },
    { label: '深色', value: 'dark' },
    { label: '跟随系统', value: 'system' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>主题</Text>
      <View style={styles.modeRow}>
        {modes.map(({ label, value }) => (
          <Pressable
            key={value}
            style={[
              styles.modeBtn,
              {
                backgroundColor:
                  mode === value ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setMode(value)}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: mode === value ? '#ffffff' : colors.text },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.logoutBtn, { backgroundColor: colors.danger }]}
        onPress={() => void signOut()}
      >
        <Text style={styles.logoutText}>退出登录</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 14,
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
