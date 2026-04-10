// ============================================================
// DrawerNavigator – left-side drawer menu
// ============================================================
//
//  ┌─────────────────┐
//  │ 日历            │
//  │ 视图            │
//  │  ○ 月视图       │
//  │  ● 周视图       │
//  │  ○ 日视图       │
//  │  ○ 议程视图     │
//  │                 │
//  │ 我的日历        │
//  │ ☑ 个人  ●      │
//  │ ☑ 工作  ●      │
//  │ + 新建日历      │
//  │                 │
//  │ ⚙ 设置         │
//  └─────────────────┘
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../hooks/useTheme';
import TopBar from '../components/layout/TopBar';
import CalendarScreen from '../screens/CalendarScreen';
import TodoScreen from '../screens/TodoScreen';
import type { RootStackParamList } from './AppNavigator';

// ---------------------------------------------------------------------------
// View types
// ---------------------------------------------------------------------------

type ViewType = 'month' | 'week' | 'day' | 'agenda';
const VIEW_LABELS: Record<ViewType, string> = {
  month: '月视图',
  week: '周视图',
  day: '日视图',
  agenda: '议程视图',
};

// ---------------------------------------------------------------------------
// Param list
// ---------------------------------------------------------------------------

export type DrawerParamList = {
  CalendarTab: { initialView?: ViewType; focusDate?: string } | undefined;
  TodoTab: undefined;
};

// ---------------------------------------------------------------------------
// Mock calendar data (placeholder until Task 10 wires in real data)
// ---------------------------------------------------------------------------

interface CalendarItem {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

const DEFAULT_CALENDARS: CalendarItem[] = [
  { id: '1', name: '个人', color: '#1a73e8', visible: true },
  { id: '2', name: '工作', color: '#34a853', visible: true },
];

// ---------------------------------------------------------------------------
// Custom drawer content
// ---------------------------------------------------------------------------

function CustomDrawerContent(
  props: DrawerContentComponentProps,
): React.JSX.Element {
  const { colors } = useTheme();
  const activeCalendarRoute = props.state.routes.find((route) => route.name === 'CalendarTab');
  const routeView = (activeCalendarRoute?.params as DrawerParamList['CalendarTab'])?.initialView ?? 'month';
  const [activeView, setActiveView] = useState<ViewType>(routeView);
  const [calendars, setCalendars] = useState<CalendarItem[]>(DEFAULT_CALENDARS);
  // Access root stack navigator to navigate to Settings
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    setActiveView(routeView);
  }, [routeView]);

  const toggleCalendar = useCallback((id: string) => {
    setCalendars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
    );
  }, []);

  const handleSettings = useCallback(() => {
    props.navigation.closeDrawer();
    rootNavigation.navigate('Settings');
  }, [props.navigation, rootNavigation]);

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.surface }}
    >
      {/* ── Calendar section header ── */}
      <Text style={[styles.sectionHeader, { color: colors.text }]}>日历</Text>

      {/* ── View switcher ── */}
      <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>
        视图
      </Text>
      {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
        <Pressable
          key={v}
          style={({ pressed }) => [
            styles.viewItem,
            activeView === v && { backgroundColor: colors.accentLight },
            pressed && activeView !== v && { backgroundColor: colors.bgSecondary },
          ]}
          onPress={() => {
            setActiveView(v);
            props.navigation.navigate('CalendarTab', { initialView: v });
            props.navigation.closeDrawer();
          }}
          accessibilityLabel={VIEW_LABELS[v]}
        >
          <View
            style={[
              styles.radio,
              {
                borderColor: activeView === v ? colors.primary : colors.border,
              },
            ]}
          >
            {activeView === v && (
              <View
                style={[styles.radioDot, { backgroundColor: colors.primary }]}
              />
            )}
          </View>
          <Text
            style={[
              styles.viewLabel,
              {
                color: activeView === v ? colors.primary : colors.text,
                fontWeight: activeView === v ? '600' : '400',
              },
            ]}
          >
            {VIEW_LABELS[v]}
          </Text>
        </Pressable>
      ))}

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* ── Calendar list ── */}
      <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>
        我的日历
      </Text>
      {calendars.map((cal) => (
        <Pressable
          key={cal.id}
          style={({ pressed }) => [
            styles.calendarItem,
            pressed && { backgroundColor: colors.bgSecondary },
          ]}
          onPress={() => toggleCalendar(cal.id)}
          accessibilityLabel={`${cal.visible ? '隐藏' : '显示'}日历 ${cal.name}`}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: cal.visible ? cal.color : 'transparent',
                borderColor: cal.color,
              },
            ]}
          >
            {cal.visible && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.calendarName, { color: colors.text }]}>
            {cal.name}
          </Text>
          <View
            style={[styles.colorDot, { backgroundColor: cal.color }]}
          />
        </Pressable>
      ))}

      <Pressable
        style={({ pressed }) => [
          styles.addCalendar,
          pressed && { backgroundColor: colors.bgSecondary },
        ]}
        onPress={() => {
          /* TODO: navigate to create calendar screen */
        }}
      >
        <Text style={[styles.addCalendarText, { color: colors.primary }]}>
          + 新建日历
        </Text>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* ── Settings ── */}
      <Pressable
        style={({ pressed }) => [
          styles.settingsRow,
          pressed && { backgroundColor: colors.bgSecondary },
        ]}
        onPress={handleSettings}
        accessibilityLabel="设置"
      >
        <Text style={[styles.settingsIcon, { color: colors.text }]}>⚙</Text>
        <Text style={[styles.settingsLabel, { color: colors.text }]}>
          设置
        </Text>
      </Pressable>
    </DrawerContentScrollView>
  );
}

// ---------------------------------------------------------------------------
// Navigator
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Header component with access to root navigator
// ---------------------------------------------------------------------------

function DrawerHeader(
  { navigation }: { navigation: { openDrawer: () => void; navigate: (screen: 'CalendarTab', params?: DrawerParamList['CalendarTab']) => void } },
): React.JSX.Element {
  const rootNav = useNavigation<StackNavigationProp<RootStackParamList>>();
  return (
    <TopBar
      onMenuPress={() => navigation.openDrawer()}
      onSearchPress={() => rootNav.navigate('Search')}
      onTodayPress={() => {
        navigation.navigate('CalendarTab', { focusDate: 'today' });
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Navigator
// ---------------------------------------------------------------------------

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function DrawerNavigator(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        header: () => <DrawerHeader navigation={navigation} />,
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 280,
        },
        drawerType: 'slide',
        overlayColor: 'rgba(0,0,0,0.5)',
      })}
    >
      <Drawer.Screen name="CalendarTab" component={CalendarScreen} />
      <Drawer.Screen name="TodoTab" component={TodoScreen} />
    </Drawer.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  viewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewLabel: {
    fontSize: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  calendarName: {
    flex: 1,
    fontSize: 15,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    // per spec: 10x10 with radius 5
  },
  addCalendar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  addCalendarText: {
    fontSize: 15,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  settingsIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  settingsLabel: {
    fontSize: 15,
  },
});
