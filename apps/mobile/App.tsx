import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import type { WidgetItem } from '@project-calendar/shared';
import { formatDateCN } from '@project-calendar/shared';

export default function App() {
  const today = formatDateCN(new Date());

  // Demonstrate that shared types are accessible
  const _exampleWidget: WidgetItem = {
    id: '1',
    type: 'todo',
    title: 'Example Todo',
    timeText: '14:00',
    color: '#34a853',
    isCompleted: false,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Project Calendar - Mobile</Text>
      <Text style={styles.date}>{today}</Text>
      <Text style={styles.subtitle}>
        Monorepo setup complete. Shared types imported successfully.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
