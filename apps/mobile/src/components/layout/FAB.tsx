// ============================================================
// FAB – Floating Action Button
// ============================================================
//
//              ┌─────────────┐
//              │  + 新建日程  │
//              ├─────────────┤
//              │  + 新建待办  │
//              └─────────────┘
//                     ●       <- FAB
//
// Tap the FAB to expand the two options; tap either option to
// navigate to the corresponding creation screen.
// ============================================================

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FABProps {
  onNewEvent?: () => void;
  onNewTodo?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FAB({
  onNewEvent,
  onNewTodo,
}: FABProps): React.JSX.Element {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
    setExpanded((v) => !v);
  }, [expanded, animation]);

  const collapse = useCallback(() => {
    Animated.spring(animation, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
    setExpanded(false);
  }, [animation]);

  const handleNewEvent = useCallback(() => {
    collapse();
    onNewEvent?.();
  }, [collapse, onNewEvent]);

  const handleNewTodo = useCallback(() => {
    collapse();
    onNewTodo?.();
  }, [collapse, onNewTodo]);

  // Opacity + translateY for the menu panel
  const menuOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const menuTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  // Overlay opacity
  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  // Rotation for the FAB "+" icon
  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Semi-transparent overlay when expanded */}
      {expanded && (
        <TouchableWithoutFeedback onPress={collapse}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              styles.overlay,
              { opacity: overlayOpacity },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Floating container */}
      <View
        style={[
          styles.fabContainer,
          { bottom: insets.bottom + 24, right: 20 },
        ]}
        pointerEvents="box-none"
      >
        {/* Expanded menu */}
        <Animated.View
          style={[
            styles.menuPanel,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: menuOpacity,
              transform: [{ translateY: menuTranslateY }],
            },
          ]}
          pointerEvents={expanded ? 'auto' : 'none'}
        >
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomColor: colors.border },
              pressed && { backgroundColor: colors.bgSecondary },
            ]}
            onPress={handleNewEvent}
            accessibilityLabel="新建日程"
          >
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              + 新建日程
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: colors.bgSecondary },
            ]}
            onPress={handleNewTodo}
            accessibilityLabel="新建待办"
          >
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              + 新建待办
            </Text>
          </Pressable>
        </Animated.View>

        {/* FAB button */}
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={toggle}
          accessibilityLabel={expanded ? '收起菜单' : '新建'}
        >
          <Animated.Text
            style={[styles.fabIcon, { transform: [{ rotate: rotation }] }]}
          >
            +
          </Animated.Text>
        </Pressable>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: '#000000',
  },
  fabContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
  },
  menuPanel: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    minWidth: 140,
    // Shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
    includeFontPadding: false,
  },
});
