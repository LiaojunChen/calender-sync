'use client';

import React, { useRef, useLayoutEffect, useCallback } from 'react';
import styles from './ScrollPickerColumn.module.css';

export const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;
const PAD = Math.floor(VISIBLE_COUNT / 2); // 2 padding items top/bottom

interface Item {
  label: string;
  value: string | number;
}

interface Props {
  items: Item[];
  value: string | number;
  onChange: (v: string | number) => void;
}

export default function ScrollPickerColumn({ items, value, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to selected value (without triggering onChange)
  const scrollToIdx = useCallback(
    (idx: number, smooth = false) => {
      if (!scrollRef.current) return;
      programmatic.current = true;
      if (smooth) {
        scrollRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
        setTimeout(() => { programmatic.current = false; }, 400);
      } else {
        scrollRef.current.scrollTop = idx * ITEM_HEIGHT;
        requestAnimationFrame(() => { programmatic.current = false; });
      }
    },
    [],
  );

  // Sync scroll position whenever value or items change
  useLayoutEffect(() => {
    const idx = items.findIndex((i) => i.value === value);
    if (idx >= 0) scrollToIdx(idx);
  }, [value, items, scrollToIdx]);

  const handleScroll = useCallback(() => {
    if (programmatic.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!scrollRef.current || programmatic.current) return;
      const raw = scrollRef.current.scrollTop / ITEM_HEIGHT;
      const idx = Math.max(0, Math.min(Math.round(raw), items.length - 1));
      // Snap to exact grid position
      scrollToIdx(idx);
      if (items[idx].value !== value) {
        onChange(items[idx].value);
      }
    }, 80);
  }, [items, value, onChange, scrollToIdx]);

  return (
    <div className={styles.wrapper}>
      {/* Fade masks via pseudo-elements in CSS */}
      <div className={styles.highlight} />
      <div
        ref={scrollRef}
        className={styles.scroll}
        onScroll={handleScroll}
        style={{ height: VISIBLE_COUNT * ITEM_HEIGHT }}
      >
        {/* Top padding */}
        {Array.from({ length: PAD }).map((_, i) => (
          <div key={`pt${i}`} className={styles.item} />
        ))}
        {items.map((item) => (
          <div
            key={item.value}
            className={`${styles.item} ${item.value === value ? styles.itemSelected : ''}`}
            onClick={() => {
              const idx = items.indexOf(item);
              scrollToIdx(idx, true);
              onChange(item.value);
            }}
          >
            {item.label}
          </div>
        ))}
        {/* Bottom padding */}
        {Array.from({ length: PAD }).map((_, i) => (
          <div key={`pb${i}`} className={styles.item} />
        ))}
      </div>
    </div>
  );
}
