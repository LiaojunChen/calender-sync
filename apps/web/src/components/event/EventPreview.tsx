'use client';

import React, { useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import { formatTimeRange } from '@project-calendar/shared';
import styles from './EventPreview.module.css';

interface EventPreviewProps {
  event: Event;
  calendar: Calendar | undefined;
  /** Anchor rect from the clicked event block */
  anchorRect: DOMRect;
  /** Whether this event is a recurring instance */
  isRecurring?: boolean;
  /** Whether this event should be displayed as read-only */
  readOnly?: boolean;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

function getPopoverPosition(anchorRect: DOMRect, popoverHeight: number): { top: number; left: number } {
  if (typeof window === 'undefined') {
    return { top: 16, left: 16 };
  }

  const popW = 300;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchorRect.right + 8;
  let top = anchorRect.top;

  if (left + popW > vw - 16) {
    left = anchorRect.left - popW - 8;
  }
  if (left < 16) {
    left = Math.max(16, anchorRect.left);
  }
  if (top + popoverHeight > vh - 16) {
    top = vh - popoverHeight - 16;
  }
  if (top < 16) {
    top = 16;
  }

  return { top, left };
}

export default function EventPreview({
  event,
  calendar,
  anchorRect,
  isRecurring = false,
  readOnly = false,
  onEdit,
  onDelete,
  onClose,
}: EventPreviewProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const fallbackPosition = useMemo(
    () => getPopoverPosition(anchorRect, 240),
    [anchorRect],
  );

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const { top, left } = getPopoverPosition(anchorRect, popover.offsetHeight || 240);
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }, [anchorRect]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const color = event.color ?? calendar?.color ?? '#039be5';
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  const timeText = event.is_all_day
    ? '全天'
    : formatTimeRange(start, end);

  return (
    <>
      <div className={styles.overlay} onMouseDown={handleOverlayClick} />
      <div
        className={styles.popover}
        ref={popoverRef}
        style={{ top: `${fallbackPosition.top}px`, left: `${fallbackPosition.left}px` }}
      >
        <div className={styles.header}>
          <div className={styles.colorStrip} style={{ backgroundColor: color }} />
          <div className={styles.headerInfo}>
            <div className={styles.title}>{event.title}</div>
            <div className={styles.time}>{timeText}</div>
          </div>
        </div>

        {/* Recurring badge */}
        {isRecurring && (
          <div className={styles.recurringBadge}>
            ↻ 重复事件
          </div>
        )}

        {event.location && (
          <div className={styles.detail}>
            <span className={styles.detailIcon}>{'\u{1F4CD}'}</span>
            {event.location}
          </div>
        )}

        {event.description && (
          <div className={styles.detail}>
            <span className={styles.detailIcon}>{'\u{1F4DD}'}</span>
            {event.description}
          </div>
        )}

        {calendar && (
          <div className={styles.calendarBadge}>
            <span
              className={styles.calendarDot}
              style={{ backgroundColor: calendar.color }}
            />
            {calendar.name}
          </div>
        )}

        {!readOnly && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onEdit(event)}
            >
              编辑
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={() => onDelete(event.id)}
            >
              删除
            </button>
          </div>
        )}
      </div>
    </>
  );
}
