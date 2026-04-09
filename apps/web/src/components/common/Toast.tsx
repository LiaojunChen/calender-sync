'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from './Toast.module.css';

// ============================================================
// Types
// ============================================================

export type ToastType = 'error' | 'success' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  /** Whether the toast is in the fade-out phase */
  exiting: boolean;
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ============================================================
// Context
// ============================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

// ============================================================
// Provider
// ============================================================

const AUTO_DISMISS_MS = 4000;
const EXIT_ANIMATION_MS = 300;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Map of toastId → dismiss timeout handle
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /** Trigger the exit animation and then remove the toast from state */
  const dismiss = useCallback((id: string) => {
    // Mark as exiting (triggers CSS animation)
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    // Remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_ANIMATION_MS);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

      // Auto-dismiss after AUTO_DISMISS_MS
      const handle = setTimeout(() => {
        dismiss(id);
        timersRef.current.delete(id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(id, handle);
    },
    [dismiss],
  );

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((handle) => clearTimeout(handle));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container rendered at the top-right corner */}
      <div className={styles.toastContainer} aria-live="assertive" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={[
              styles.toast,
              styles[toast.type],
              toast.exiting ? styles.exiting : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.icon} aria-hidden="true">
              {toast.type === 'error' && '✕'}
              {toast.type === 'success' && '✓'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className={styles.message}>{toast.message}</span>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="关闭提示"
              onClick={() => {
                // Cancel the auto-dismiss timer and dismiss immediately
                const handle = timersRef.current.get(toast.id);
                if (handle) {
                  clearTimeout(handle);
                  timersRef.current.delete(toast.id);
                }
                dismiss(toast.id);
              }}
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
