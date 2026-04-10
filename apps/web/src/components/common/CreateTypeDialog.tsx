'use client';
import React from 'react';
import styles from './CreateTypeDialog.module.css';

interface Props {
  onSelectEvent: () => void;
  onSelectTodo: () => void;
  onClose: () => void;
}

export default function CreateTypeDialog({ onSelectEvent, onSelectTodo, onClose }: Props) {
  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.dialog}>
        <p className={styles.title}>新建</p>
        <div className={styles.options}>
          <button className={styles.optionBtn} onClick={onSelectEvent}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>日程</span>
          </button>
          <button className={`${styles.optionBtn} ${styles.optionBtnTodo}`} onClick={onSelectTodo}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M8 12l3 3 5-6" />
            </svg>
            <span>待办</span>
          </button>
        </div>
      </div>
    </div>
  );
}
