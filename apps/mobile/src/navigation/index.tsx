// ============================================================
// Root Navigator – auth gate
// ============================================================
//
//  if (loading)   → splash / loading indicator
//  if (authed)    → AppNavigator  (tabs + drawer + stack)
//  else           → LoginScreen
// ============================================================

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import LoginScreen from '../screens/LoginScreen';
import AppNavigator from './AppNavigator';

export default function RootNavigator(): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const { status } = useAuth();

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
    <NavigationContainer theme={navTheme}>
      {status === 'authenticated' ? <AppNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}
