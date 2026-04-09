// ============================================================
// TopBar
// ============================================================
//  ┌────────────────────────────────────────────┐
//  │  ☰   2026年4月              🔍   今天       │
//  └────────────────────────────────────────────┘

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopBarProps {
  /** Current month/year to display in centre (e.g. "2026年4月") */
  title?: string;
  /** Called when the hamburger icon is pressed */
  onMenuPress?: () => void;
  /** Called when the search icon is pressed */
  onSearchPress?: () => void;
  /** Called when the "今天" button is pressed */
  onTodayPress?: () => void;
}

// ---------------------------------------------------------------------------
// Helper: build default title from current date
// ---------------------------------------------------------------------------

function getDefaultTitle(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TopBar({
  title,
  onMenuPress,
  onSearchPress,
  onTodayPress,
}: TopBarProps): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const displayTitle = title ?? getDefaultTitle();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 4,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Hamburger */}
      <Pressable
        style={({ pressed }) => [
          styles.iconBtn,
          pressed && { backgroundColor: colors.bgSecondary },
        ]}
        onPress={onMenuPress}
        hitSlop={8}
        accessibilityLabel="打开菜单"
      >
        <HamburgerIcon color={colors.text} />
      </Pressable>

      {/* Centre title */}
      <Text style={[styles.title, { color: colors.text }]}>{displayTitle}</Text>

      {/* Right actions */}
      <View style={styles.rightActions}>
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && { backgroundColor: colors.bgSecondary },
          ]}
          onPress={onSearchPress}
          hitSlop={8}
          accessibilityLabel="搜索"
        >
          <SearchIcon color={colors.text} />
        </Pressable>

        <Pressable
          style={[styles.todayBtn, { borderColor: colors.border }]}
          onPress={onTodayPress}
          hitSlop={4}
          accessibilityLabel="今天"
        >
          <Text style={[styles.todayText, { color: colors.text }]}>
            今天
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Minimal inline icons rendered with View/Text
// ---------------------------------------------------------------------------

function HamburgerIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <View style={styles.hamburger}>
      <View style={[styles.hamburgerLine, { backgroundColor: color }]} />
      <View style={[styles.hamburgerLine, { backgroundColor: color }]} />
      <View style={[styles.hamburgerLine, { backgroundColor: color }]} />
    </View>
  );
}

function SearchIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <Text style={{ fontSize: 18, color, lineHeight: 24 }}>&#128269;</Text>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginLeft: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 4,
  },
  todayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  hamburger: {
    width: 22,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    height: 2,
    borderRadius: 1,
  },
});
