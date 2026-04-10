// ============================================================
// Root Navigator – auth gate
// ============================================================
//
//  if (loading)   → splash / loading indicator
//  if (authed)    → AppNavigator  (tabs + drawer + stack)
//  else           → LoginScreen
// ============================================================

import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import LoginScreen from '../screens/LoginScreen';
import AppNavigator from './AppNavigator';
import { isSupabaseConfigured } from '../lib/supabase';
import { createWidgetLinking } from './widgetLinks';
import { syncWidgetData } from '../widget/widgetSync';

export default function RootNavigator(): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const { status } = useAuth();
  const linking = useMemo(() => createWidgetLinking(isSupabaseConfigured), []);

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
      };

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }
    void syncWidgetData().catch((error: unknown) => {
      console.warn('widget sync failed', error);
    });
  }, [status]);

  if (status === 'loading') {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      {status === 'authenticated' ? <AppNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}
