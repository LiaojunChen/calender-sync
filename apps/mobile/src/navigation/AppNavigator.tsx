// ============================================================
// AppNavigator
// ============================================================
//
// Root app structure (for authenticated users):
//
//   RootStack
//   └── Main  → BottomTabs
//       ├── Tab: 日历  → CalendarWithDrawer (DrawerNavigator)
//       └── Tab: 待办  → TodoScreen
//   ├── EventForm   → EventFormScreen
//   ├── TodoForm    → TodoFormScreen
//   └── Settings    → SettingsScreen
// ============================================================

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import DrawerNavigator from './DrawerNavigator';
import TodoScreen from '../screens/TodoScreen';
import EventFormScreen from '../screens/EventFormScreen';
import TodoFormScreen from '../screens/TodoFormScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SearchScreen from '../screens/SearchScreen';

// ---------------------------------------------------------------------------
// Param lists
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Main: undefined;
  EventForm: { eventId?: string } | undefined;
  EventDetail: { eventId: string };
  TodoForm: { todoId?: string } | undefined;
  Settings: undefined;
  Search: undefined;
};

export type BottomTabParamList = {
  Calendar: undefined;
  Todos: undefined;
};

// ---------------------------------------------------------------------------
// Bottom Tab Navigator
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<BottomTabParamList>();

function BottomTabNavigator(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Calendar"
        component={DrawerNavigator}
        options={{
          tabBarLabel: '日历',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>📅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Todos"
        component={TodoScreen}
        options={{
          tabBarLabel: '待办',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>✓</Text>
          ),
          header: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root Stack
// ---------------------------------------------------------------------------

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Main" component={BottomTabNavigatorWithFAB} />
      <Stack.Screen
        name="EventForm"
        component={EventFormScreen}
        options={{
          headerShown: true,
          title: '新建日程',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="TodoForm"
        component={TodoFormScreen}
        options={{
          headerShown: true,
          title: '新建待办',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: '设置',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// BottomTabNavigator with FAB overlay
// ---------------------------------------------------------------------------

import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import FAB from '../components/layout/FAB';

type MainNavProp = StackNavigationProp<RootStackParamList>;

function BottomTabNavigatorWithFAB(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation<MainNavProp>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <BottomTabNavigator />
      <FAB
        onNewEvent={() => navigation.navigate('EventForm')}
        onNewTodo={() => navigation.navigate('TodoForm')}
      />
    </View>
  );
}
