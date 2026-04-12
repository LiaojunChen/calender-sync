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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  getCalendars,
  updateCalendar,
  type Calendar,
} from '@project-calendar/shared';
import { createDemoCalendarData } from '../data/demoCalendarData';
import { useAppSettings } from '../hooks/useAppSettings';
import { useTheme } from '../hooks/useTheme';
import { getSupabaseClientOrNull, isSupabaseConfigured } from '../lib/supabase';
import TopBar from '../components/layout/TopBar';
import CalendarScreen from '../screens/CalendarScreen';
import TodoScreen from '../screens/TodoScreen';
import type { RootStackParamList } from './AppNavigator';
import {
  buildDrawerCalendarItems,
  loadDrawerCalendarsWithDeps,
  toggleDrawerCalendarVisibilityLocally,
  toggleDrawerCalendarVisibilityWithDeps,
} from './drawerCalendarCore';

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
  CalendarTab: { initialView?: ViewType; focusDate?: string; headerTitle?: string } | undefined;
  TodoTab: undefined;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '加载日历失败';
}

interface CustomDrawerContentExtraProps {
  calendars: Calendar[];
  loadingCalendars: boolean;
  calendarError: string | null;
  togglingCalendarId: string | null;
  onToggleCalendar: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Custom drawer content
// ---------------------------------------------------------------------------

function CustomDrawerContent(
  props: DrawerContentComponentProps & CustomDrawerContentExtraProps,
): React.JSX.Element {
  const { colors } = useTheme();
  const { settings } = useAppSettings();
  const activeCalendarRoute = props.state.routes.find((route) => route.name === 'CalendarTab');
  const routeView =
    (activeCalendarRoute?.params as DrawerParamList['CalendarTab'])?.initialView
    ?? settings.default_view;
  const [activeView, setActiveView] = useState<ViewType>(routeView);
  const calendarItems = useMemo(
    () => buildDrawerCalendarItems(props.calendars),
    [props.calendars],
  );
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    setActiveView(routeView);
  }, [routeView]);

  const handleSettings = useCallback(() => {
    props.navigation.closeDrawer();
    rootNavigation.navigate('Settings');
  }, [props.navigation, rootNavigation]);

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.surface }}
    >
      <Text style={[styles.sectionHeader, { color: colors.text }]}>日历</Text>

      <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>视图</Text>
      {(Object.keys(VIEW_LABELS) as ViewType[]).map((viewType) => (
        <Pressable
          key={viewType}
          style={({ pressed }) => [
            styles.viewItem,
            activeView === viewType && { backgroundColor: colors.accentLight },
            pressed && activeView !== viewType && { backgroundColor: colors.bgSecondary },
          ]}
          onPress={() => {
            setActiveView(viewType);
            props.navigation.navigate('CalendarTab', { initialView: viewType });
            props.navigation.closeDrawer();
          }}
          accessibilityLabel={VIEW_LABELS[viewType]}
        >
          <View
            style={[
              styles.radio,
              {
                borderColor: activeView === viewType ? colors.primary : colors.border,
              },
            ]}
          >
            {activeView === viewType ? (
              <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
            ) : null}
          </View>
          <Text
            style={[
              styles.viewLabel,
              {
                color: activeView === viewType ? colors.primary : colors.text,
                fontWeight: activeView === viewType ? '600' : '400',
              },
            ]}
          >
            {VIEW_LABELS[viewType]}
          </Text>
        </Pressable>
      ))}

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>我的日历</Text>
      {props.loadingCalendars ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
      {props.calendarError ? (
        <Text style={[styles.calendarError, { color: colors.danger }]}>
          {props.calendarError}
        </Text>
      ) : null}
      {calendarItems.map((calendar) => (
        <Pressable
          key={calendar.id}
          style={({ pressed }) => [
            styles.calendarItem,
            pressed && { backgroundColor: colors.bgSecondary },
          ]}
          onPress={() => props.onToggleCalendar(calendar.id)}
          accessibilityLabel={`${calendar.visible ? '隐藏' : '显示'}日历 ${calendar.name}`}
          disabled={props.togglingCalendarId === calendar.id}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: calendar.visible ? calendar.color : 'transparent',
                borderColor: calendar.color,
              },
            ]}
          >
            {calendar.visible ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={[styles.calendarName, { color: colors.text }]}>
            {calendar.name}
          </Text>
          <View style={[styles.colorDot, { backgroundColor: calendar.color }]} />
          {props.togglingCalendarId === calendar.id ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.calendarSpinner}
            />
          ) : null}
        </Pressable>
      ))}

      <Pressable
        style={({ pressed }) => [
          styles.settingsRow,
          pressed && { backgroundColor: colors.bgSecondary },
        ]}
        onPress={handleSettings}
        accessibilityLabel="设置"
      >
        <Text style={[styles.settingsIcon, { color: colors.text }]}>⚙</Text>
        <Text style={[styles.settingsLabel, { color: colors.text }]}>设置</Text>
      </Pressable>
    </DrawerContentScrollView>
  );
}

// ---------------------------------------------------------------------------
// Header component with access to root navigator
// ---------------------------------------------------------------------------

function DrawerHeader({
  navigation,
  title,
}: {
  navigation: {
    openDrawer: () => void;
    navigate: (screen: 'CalendarTab', params?: DrawerParamList['CalendarTab']) => void;
  };
  title?: string;
}): React.JSX.Element {
  const rootNav = useNavigation<StackNavigationProp<RootStackParamList>>();
  return (
    <TopBar
      title={title}
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
  const { settings } = useAppSettings();
  const [calendars, setCalendars] = useState<Calendar[] | undefined>(undefined);
  const [loadingCalendars, setLoadingCalendars] = useState(isSupabaseConfigured);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [togglingCalendarId, setTogglingCalendarId] = useState<string | null>(null);

  const refreshCalendars = useCallback(async (): Promise<void> => {
    setLoadingCalendars(true);
    setCalendarError(null);
    try {
      const nextCalendars = await loadDrawerCalendarsWithDeps({
        isSupabaseConfigured,
        getSupabaseClientOrNull,
        getDemoCalendars: () => createDemoCalendarData().calendars,
        getCalendars,
      });
      setCalendars(nextCalendars);
    } catch (error) {
      setCalendarError(toErrorMessage(error));
    } finally {
      setLoadingCalendars(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCalendars();
    }, [refreshCalendars]),
  );

  const handleToggleCalendar = useCallback((calendarId: string) => {
    if (!calendars) {
      return;
    }

    if (!isSupabaseConfigured) {
      setCalendars((prev) =>
        prev ? toggleDrawerCalendarVisibilityLocally(prev, calendarId) : prev,
      );
      return;
    }

    const client = getSupabaseClientOrNull();
    if (!client) {
      setCalendarError('Supabase client unavailable');
      return;
    }

    setTogglingCalendarId(calendarId);
    setCalendarError(null);

    void (async () => {
      try {
        const nextCalendars = await toggleDrawerCalendarVisibilityWithDeps(
          client,
          calendars,
          calendarId,
          { updateCalendar },
        );
        setCalendars(nextCalendars);
      } catch (error) {
        const message = toErrorMessage(error);
        setCalendarError(message);
        Alert.alert('更新失败', message);
      } finally {
        setTogglingCalendarId(null);
      }
    })();
  }, [calendars]);

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          calendars={calendars ?? []}
          loadingCalendars={loadingCalendars}
          calendarError={calendarError}
          togglingCalendarId={togglingCalendarId}
          onToggleCalendar={handleToggleCalendar}
        />
      )}
      screenOptions={({ navigation, route }) => ({
        headerShown: true,
        header: () => (
          <DrawerHeader
            navigation={navigation}
            title={(route.params as DrawerParamList['CalendarTab'])?.headerTitle}
          />
        ),
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 280,
        },
        drawerType: 'slide',
        overlayColor: 'rgba(0,0,0,0.5)',
      })}
    >
      <Drawer.Screen name="CalendarTab">
        {() => (
          <CalendarScreen
            calendarsOverride={calendars}
            defaultView={settings.default_view}
          />
        )}
      </Drawer.Screen>
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
  },
  loadingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  calendarError: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  calendarSpinner: {
    marginLeft: 8,
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
