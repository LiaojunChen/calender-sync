'use client';

import React, { useEffect, useCallback } from 'react';
import styles from './RecurrenceActionDialog.module.css';

export type RecurrenceEditAction = 'this' | 'this_and_future' | 'all';
export type RecurrenceDeleteAction = 'this' | 'this_and_future' | 'all';

interface RecurrenceActionDialogProps {
  mode: 'edit' | 'delete';
  onConfirm: (action: RecurrenceEditAction | RecurrenceDeleteAction) => void;
  onCancel: () => void;
}

export default function RecurrenceActionDialog({
  mode,
  onConfirm,
  onCancel,
}: RecurrenceActionDialogProps) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onCancel();
    },
    [onCancel],
  );

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayClick}>
      <div className={styles.dialog}>
        <h3 className={styles.title}>
          {mode === 'edit' ? '编辑重复事件' : '删除重复事件'}
        </h3>
        <p className={styles.subtitle}>
          {mode === 'edit'
            ? '您想要修改哪些事件？'
            : '您想要删除哪些事件？'}
        </p>

        <div className={styles.options}>
          <button
            type="button"
            className={styles.optionBtn}
            onClick={() => onConfirm('this')}
          >
            {mode === 'edit' ? '仅修改本次' : '仅删除本次'}
          </button>

          <button
            type="button"
            className={styles.optionBtn}
            onClick={() => onConfirm('this_and_future')}
          >
            {mode === 'edit' ? '修改此事件及后续所有' : '删除此事件及后续所有'}
          </button>

          <button
            type="button"
            className={styles.optionBtn}
            onClick={() => onConfirm('all')}
          >
            {mode === 'edit' ? '修改所有事件' : '删除所有'}
          </button>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
