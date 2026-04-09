import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/components/common/ThemeProvider';
import { SnackbarProvider } from './src/components/common/Snackbar';
import RootNavigator from './src/navigation';
import { requestNotificationPermissions } from './src/notifications/scheduler';

function AppContent(): React.JSX.Element {
  const { isDark } = useTheme();

  // Request notification permissions once on app start
  useEffect(() => {
    void requestNotificationPermissions();
  }, []);

  return (
    <SnackbarProvider>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SnackbarProvider>
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
