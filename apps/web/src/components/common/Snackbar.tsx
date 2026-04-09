'use client';

import React from 'react';
import type { SnackbarState } from '@/hooks/useUndo';
import styles from './Snackbar.module.css';

interface SnackbarProps {
  state: SnackbarState;
  onUndo: () => void;
  onClose: () => void;
}

export default function Snackbar({ state, onUndo, onClose }: SnackbarProps) {
  if (!state.visible) return null;

  return (
    <div
      className={`${styles.snackbar}${state.exiting ? ` ${styles.exiting}` : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className={styles.message}>{state.description}</span>

      <button
        type="button"
        className={styles.undoBtn}
        onClick={onUndo}
        aria-label="撤销操作"
      >
        撤销
      </button>

      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="关闭提示"
      >
        {/* × close icon */}
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <line x1="3" y1="3" x2="13" y2="13" />
          <line x1="13" y1="3" x2="3" y2="13" />
        </svg>
      </button>
    </div>
  );
}
