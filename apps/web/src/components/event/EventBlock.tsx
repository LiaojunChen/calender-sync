'use client';

import React, { useRef, useCallback } from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import styles from './EventBlock.module.css';

/** Height in pixels for one hour in the time grid */
export const HOUR_HEIGHT = 48;

/** Minimum height in pixels for very short events */
const MIN_EVENT_HEIGHT = 20;

/** Movement threshold in pixels to distinguish click from drag */
const DRAG_THRESHOLD = 5;

/** Snap interval in minutes */
const SNAP_MINUTES = 15;

interface EventBlockProps {
  event: Event;
  calendar: Calendar | undefined;
  /** Column index within the overlap group (0-based) */
  colIndex: number;
  /** Total columns in the overlap group */
  colTotal: number;
  /** Called when the event is clicked (for preview popover) */
  onClick?: (event: Event, rect: DOMRect) => void;
  /** Called when the event is dragged to a new position */
  onDragMove?: (eventId: string, newStartMinutes: number, dayOffset: number) => void;
  /** Called when the event is resized from the bottom edge */
  onDragResize?: (eventId: string, newEndMinutes: number) => void;
  /** Pixel width of a day column (needed for cross-day drag) */
  dayColumnWidth?: number;
}

/**
 * Resolve the effective display color: event's own color, or its calendar's color.
 */
function getEventColor(event: Event, calendar: Calendar | undefined): string {
  return event.color ?? calendar?.color ?? '#039be5';
}

/**
 * Lighten a hex colour for the background (20% opacity effect).
 */
function bgColor(hex: string): string {
  return hex + '33'; // ~20% alpha
}

function textColor(hex: string): string {
  return hex;
}

/**
 * Format time as H:mm
 */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h}:${m < 10 ? '0' + m : m}`;
}

/** Snap a minute value to the nearest SNAP_MINUTES interval */
function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

/**
 * A single event block positioned absolutely within a day column.
 */
export default function EventBlock({
  event,
  calendar,
  colIndex,
  colTotal,
  onClick,
  onDragMove,
  onDragResize,
  dayColumnWidth,
}: EventBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const durationMinutes = Math.max(endMinutes - startMinutes, 0);

  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);

  const color = getEventColor(event, calendar);
  const bg = bgColor(color);
  const txt = textColor(color);

  const widthPercent = 100 / colTotal;
  const leftPercent = colIndex * widthPercent;

  const showLocation = height > 40 && event.location;

  // Mouse down handler for click vs drag distinction
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only respond to left button
      if (e.button !== 0) return;
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const isResizeHandle =
        (e.target as HTMLElement).dataset.resizeHandle === 'true';

      let isDragging = false;
      let cancelled = false;

      const onMouseMove = (me: MouseEvent) => {
        if (cancelled) return;
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;

        if (!isDragging && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) {
          return;
        }
        isDragging = true;

        if (isResizeHandle && blockRef.current) {
          // Drag to resize: change height
          const parentRect = blockRef.current.parentElement?.getBoundingClientRect();
          if (parentRect) {
            const relY = me.clientY - parentRect.top;
            const newEndMins = snapMinutes(Math.max((relY / HOUR_HEIGHT) * 60, startMinutes + SNAP_MINUTES));
            // Visual feedback: update height directly during drag
            const newHeight = Math.max(((newEndMins - startMinutes) / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
            blockRef.current.style.height = `${newHeight}px`;
            // Show time tooltip
            const h = Math.floor(newEndMins / 60);
            const m = newEndMins % 60;
            blockRef.current.title = `结束: ${h}:${m < 10 ? '0' + m : m}`;
          }
        } else if (blockRef.current) {
          // Drag to move
          blockRef.current.style.opacity = '0.7';
          blockRef.current.style.zIndex = '100';
          blockRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
          // Show time tooltip
          const parentRect = blockRef.current.parentElement?.getBoundingClientRect();
          if (parentRect) {
            const relY = me.clientY - parentRect.top;
            const newStartMins = snapMinutes(Math.max((relY / HOUR_HEIGHT) * 60 - durationMinutes / 2, 0));
            const newEndMins = newStartMins + durationMinutes;
            const sh = Math.floor(newStartMins / 60);
            const sm = newStartMins % 60;
            const eh = Math.floor(newEndMins / 60);
            const em = newEndMins % 60;
            blockRef.current.title = `${sh}:${sm < 10 ? '0' + sm : sm} – ${eh}:${em < 10 ? '0' + em : em}`;
          }
        }
      };

      const onMouseUp = (me: MouseEvent) => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('keydown', onKeyDown);

        if (cancelled) return;

        if (!isDragging) {
          // It was a click
          if (onClick && blockRef.current) {
            const rect = blockRef.current.getBoundingClientRect();
            onClick(event, rect);
          }
          return;
        }

        // Reset visual state
        if (blockRef.current) {
          blockRef.current.style.opacity = '';
          blockRef.current.style.zIndex = '';
          blockRef.current.style.transform = '';
          blockRef.current.style.height = `${height}px`;
        }

        if (isResizeHandle) {
          // Compute final end minutes
          const parentRect = blockRef.current?.parentElement?.getBoundingClientRect();
          if (parentRect && onDragResize) {
            const relY = me.clientY - parentRect.top;
            const newEndMins = snapMinutes(
              Math.max((relY / HOUR_HEIGHT) * 60, startMinutes + SNAP_MINUTES),
            );
            onDragResize(event.id, Math.min(newEndMins, 24 * 60));
          }
        } else {
          // Compute final position (move)
          const parentRect = blockRef.current?.parentElement?.getBoundingClientRect();
          if (parentRect && onDragMove) {
            const relY = me.clientY - parentRect.top;
            const newStartMins = snapMinutes(
              Math.max((relY / HOUR_HEIGHT) * 60 - durationMinutes / 2, 0),
            );
            // Day offset calculation
            const dx2 = me.clientX - startX;
            const colW = dayColumnWidth || parentRect.width;
            const dayOff = Math.round(dx2 / colW);
            onDragMove(event.id, Math.min(newStartMins, 24 * 60 - durationMinutes), dayOff);
          }
        }
      };

      const onKeyDown = (ke: KeyboardEvent) => {
        if (ke.key === 'Escape') {
          cancelled = true;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          window.removeEventListener('keydown', onKeyDown);
          if (blockRef.current) {
            blockRef.current.style.opacity = '';
            blockRef.current.style.zIndex = '';
            blockRef.current.style.transform = '';
            blockRef.current.style.height = `${height}px`;
          }
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('keydown', onKeyDown);
    },
    [event, onClick, onDragMove, onDragResize, startMinutes, durationMinutes, height, dayColumnWidth],
  );

  return (
    <div
      ref={blockRef}
      className={styles.eventBlock}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 2px)`,
        backgroundColor: bg,
        borderLeftColor: color,
        color: txt,
      }}
      title={`${event.title}\n${fmtTime(event.start_time)} – ${fmtTime(event.end_time)}${event.location ? '\n' + event.location : ''}`}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.title}>{event.title}</div>
      <div className={styles.time}>
        {fmtTime(event.start_time)} – {fmtTime(event.end_time)}
      </div>
      {showLocation && (
        <div className={styles.location}>{event.location}</div>
      )}
      {/* Resize handle at bottom */}
      <div
        className={styles.resizeHandle}
        data-resize-handle="true"
      />
    </div>
  );
}

/**
 * All-day event bar used in the AllDayArea.
 */
export function AllDayEventBlock({
  event,
  calendar,
  style,
  onClick,
}: {
  event: Event;
  calendar: Calendar | undefined;
  style?: React.CSSProperties;
  onClick?: (event: Event, rect: DOMRect) => void;
}) {
  const blockRef = useRef<HTMLDivElement>(null);
  const color = getEventColor(event, calendar);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClick && blockRef.current) {
        onClick(event, blockRef.current.getBoundingClientRect());
      }
    },
    [event, onClick],
  );

  return (
    <div
      ref={blockRef}
      className={styles.allDayBlock}
      style={{
        backgroundColor: color,
        color: '#fff',
        ...style,
      }}
      title={event.title}
      onClick={handleClick}
    >
      {event.title}
    </div>
  );
}
