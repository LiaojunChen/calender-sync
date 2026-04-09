'use client';

import React from 'react';
import type { Event, Calendar } from '@project-calendar/shared';
import styles from './EventBlock.module.css';

/** Height in pixels for one hour in the time grid */
export const HOUR_HEIGHT = 48;

/** Minimum height in pixels for very short events */
const MIN_EVENT_HEIGHT = 20;

interface EventBlockProps {
  event: Event;
  calendar: Calendar | undefined;
  /** Column index within the overlap group (0-based) */
  colIndex: number;
  /** Total columns in the overlap group */
  colTotal: number;
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
  // Use the original colour for text so it is readable on the light bg
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

/**
 * A single event block positioned absolutely within a day column.
 */
export default function EventBlock({
  event,
  calendar,
  colIndex,
  colTotal,
}: EventBlockProps) {
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

  return (
    <div
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
    >
      <div className={styles.title}>{event.title}</div>
      <div className={styles.time}>
        {fmtTime(event.start_time)} – {fmtTime(event.end_time)}
      </div>
      {showLocation && (
        <div className={styles.location}>{event.location}</div>
      )}
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
}: {
  event: Event;
  calendar: Calendar | undefined;
  style?: React.CSSProperties;
}) {
  const color = getEventColor(event, calendar);

  return (
    <div
      className={styles.allDayBlock}
      style={{
        backgroundColor: color,
        color: '#fff',
        ...style,
      }}
      title={event.title}
    >
      {event.title}
    </div>
  );
}
