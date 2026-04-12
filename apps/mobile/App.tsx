import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppSettingsProvider, useAppSettings } from './src/components/common/AppSettingsProvider';
import { ThemeProvider, useTheme } from './src/components/common/ThemeProvider';
import { SnackbarProvider } from './src/components/common/Snackbar';
import RootNavigator from './src/navigation';
import { requestNotificationPermissions } from './src/notifications/scheduler';

function AppShell(): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const { isLoaded } = useAppSettings();

  // Request notification permissions once on app start
  useEffect(() => {
    void requestNotificationPermissions();
  }, []);

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <SnackbarProvider>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SnackbarProvider>
  );
}

function AppContent(): React.JSX.Element {
  return (
    <AppSettingsProvider>
      <AppShell />
    </AppSettingsProvider>
  );
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider initialMode="system">
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
