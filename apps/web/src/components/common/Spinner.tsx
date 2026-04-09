'use client';

import React from 'react';
import styles from './Spinner.module.css';

interface SpinnerProps {
  /** Accessible label (defaults to "加载中") */
  label?: string;
  /** Size in pixels (defaults to 40) */
  size?: number;
}

export default function Spinner({ label = '加载中', size = 40 }: SpinnerProps) {
  return (
    <div
      className={styles.spinnerWrapper}
      role="status"
      aria-label={label}
    >
      <div
        className={styles.spinner}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
