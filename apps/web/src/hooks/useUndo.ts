'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================
// Types
// ============================================================

export interface UndoableAction {
  /** Action category, for logging / future use */
  type: 'DELETE_EVENT' | 'DELETE_TODO' | 'MOVE_EVENT';
  /** Human-readable description shown in the Snackbar */
  description: string;
  /** Called immediately if user clicks "撤销" — reverses the local state change */
  undo: () => void;
  /** Called when the 5-second timer expires — commits the action to the server */
  commit: () => void;
}

export interface SnackbarState {
  visible: boolean;
  /** Whether the exit animation is playing */
  exiting: boolean;
  description: string;
}

export interface UseUndoReturn {
  /** Register a new undoable action; replaces any pending action */
  addUndoable: (action: UndoableAction) => void;
  /** Cancel the timer and call action.undo() */
  undoLast: () => void;
  /** Dismiss without undoing (snackbar close button) */
  dismissSnackbar: () => void;
  snackbarState: SnackbarState;
}

// ============================================================
// Constants
// ============================================================

/** How long (ms) before the pending action is auto-committed */
const COMMIT_DELAY = 5000;

/** Duration (ms) of the exit animation — must match CSS */
const EXIT_ANIMATION_MS = 300;

// ============================================================
// Hook
// ============================================================

export function useUndo(): UseUndoReturn {
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    visible: false,
    exiting: false,
    description: '',
  });

  // Keep a ref to the pending action so callbacks always see the latest value
  const pendingAction = useRef<UndoableAction | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------

  const clearTimers = useCallback(() => {
    if (commitTimerRef.current !== null) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    if (exitTimerRef.current !== null) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  /** Start the exit animation then hide the snackbar */
  const startExit = useCallback(() => {
    setSnackbarState((prev) => ({ ...prev, exiting: true }));
    exitTimerRef.current = setTimeout(() => {
      setSnackbarState({ visible: false, exiting: false, description: '' });
      exitTimerRef.current = null;
    }, EXIT_ANIMATION_MS);
  }, []);

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------

  const addUndoable = useCallback(
    (action: UndoableAction) => {
      // If there is already a pending action, commit it immediately before
      // replacing it with the new one.
      if (pendingAction.current) {
        pendingAction.current.commit();
        clearTimers();
      }

      pendingAction.current = action;

      // Show snackbar (reset exiting flag in case we're replacing mid-animation)
      setSnackbarState({
        visible: true,
        exiting: false,
        description: action.description,
      });

      // Schedule auto-commit
      commitTimerRef.current = setTimeout(() => {
        if (pendingAction.current) {
          pendingAction.current.commit();
          pendingAction.current = null;
        }
        commitTimerRef.current = null;
        startExit();
      }, COMMIT_DELAY);
    },
    [clearTimers, startExit],
  );

  const undoLast = useCallback(() => {
    if (!pendingAction.current) return;
    clearTimers();
    pendingAction.current.undo();
    pendingAction.current = null;
    startExit();
  }, [clearTimers, startExit]);

  const dismissSnackbar = useCallback(() => {
    // Commit the pending action (user explicitly dismissed without undoing)
    if (pendingAction.current) {
      pendingAction.current.commit();
      pendingAction.current = null;
    }
    clearTimers();
    startExit();
  }, [clearTimers, startExit]);

  // Cleanup on unmount — commit any pending action
  useEffect(() => {
    return () => {
      clearTimers();
      if (pendingAction.current) {
        pendingAction.current.commit();
        pendingAction.current = null;
      }
    };
  }, [clearTimers]);

  return { addUndoable, undoLast, dismissSnackbar, snackbarState };
}
