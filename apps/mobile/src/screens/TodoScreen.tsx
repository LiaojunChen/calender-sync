// ============================================================
// TodoScreen – placeholder (implemented in Task 11)
// ============================================================

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function TodoScreen(): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>待办事项</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        (Task 11 实现)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 20, fontWeight: 'bold' },
  sub: { fontSize: 13, marginTop: 4 },
});
