// ============================================================
// Snackbar – mobile undo notification
// ============================================================
//
// Usage:
//   1. Wrap your screen/app in <SnackbarProvider>
//   2. Call showSnackbar() from useSnackbar() hook
//
// Undo logic (mirrors web):
//   - softDelete → showSnackbar → 5s timer → commit (permanent delete)
//   - if user presses 撤销 → restore (cancel timer)
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SnackbarOptions {
  /** Message displayed in the snackbar */
  message: string;
  /** Label for the undo/action button */
  actionLabel?: string;
  /** Called when the user presses the action button */
  onAction?: () => void;
  /** Called when the snackbar is dismissed WITHOUT action (auto-dismiss or tap dismiss) */
  onDismiss?: () => void;
  /** Duration in ms before auto-dismiss. Default: 5000 */
  duration?: number;
}

interface SnackbarContextValue {
  showSnackbar: (options: SnackbarOptions) => void;
  hideSnackbar: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SnackbarContext = createContext<SnackbarContextValue | undefined>(
  undefined,
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface SnackbarProviderProps {
  children: React.ReactNode;
}

export function SnackbarProvider({
  children,
}: SnackbarProviderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<SnackbarOptions>({ message: '' });

  const slideAnim = useRef(new Animated.Value(100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef<SnackbarOptions>(options);
  optionsRef.current = options;

  // Clear pending timer
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Slide-in animation
  const slideIn = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [slideAnim]);

  // Slide-out / fade animation, then hide
  const slideOut = useCallback(
    (afterSlide?: () => void) => {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        afterSlide?.();
      });
    },
    [slideAnim],
  );

  const hideSnackbar = useCallback(() => {
    clearTimer();
    slideOut();
  }, [clearTimer, slideOut]);

  const showSnackbar = useCallback(
    (newOptions: SnackbarOptions) => {
      clearTimer();
      setOptions(newOptions);
      setVisible(true);
      slideAnim.setValue(100); // reset position
      slideIn();

      const duration = newOptions.duration ?? 5000;
      timerRef.current = setTimeout(() => {
        // Auto-dismiss: call onDismiss (commit delete)
        slideOut(() => {
          optionsRef.current.onDismiss?.();
        });
      }, duration);
    },
    [clearTimer, slideAnim, slideIn, slideOut],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const handleAction = useCallback(() => {
    clearTimer();
    const onAction = optionsRef.current.onAction;
    slideOut(() => {
      onAction?.();
    });
  }, [clearTimer, slideOut]);

  // Bottom offset: safe area insets + extra padding for tab bar (56px typical)
  const bottomOffset = insets.bottom + 66;

  return (
    <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.container,
            {
              bottom: bottomOffset,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.snackbar}>
            <Text style={styles.message} numberOfLines={2}>
              {options.message}
            </Text>
            {options.actionLabel ? (
              <TouchableOpacity onPress={handleAction} style={styles.actionBtn}>
                <Text style={styles.actionText}>{options.actionLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      )}
    </SnackbarContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('useSnackbar must be used inside <SnackbarProvider>');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 9999,
    // pointer-events handled by parent Animated.View
  },
  snackbar: {
    backgroundColor: '#323232',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  message: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  actionBtn: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    color: '#8ab4f8',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
