// ============================================================
// Date Utility Functions
// ============================================================

/**
 * Pad a number to two digits: 1 -> "01", 12 -> "12"
 */
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// --------------------------------------------------
// Formatting
// --------------------------------------------------

/**
 * Format a date as "YYYY年M月D日"
 * e.g. "2026年4月6日"
 */
export function formatDateCN(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * Format a date range in a compact Chinese style.
 * Same day:       "2026年4月6日"
 * Same month:     "2026年4月6日 – 12日"
 * Same year:      "2026年4月6日 – 5月3日"
 * Different year: "2025年12月28日 – 2026年1月3日"
 */
export function formatDateRangeCN(start: Date, end: Date): string {
  if (isSameDay(start, end)) {
    return formatDateCN(start);
  }

  const sy = start.getFullYear();
  const ey = end.getFullYear();
  const sm = start.getMonth();
  const em = end.getMonth();

  if (sy === ey && sm === em) {
    return `${formatDateCN(start)} – ${end.getDate()}日`;
  }

  if (sy === ey) {
    return `${formatDateCN(start)} – ${em + 1}月${end.getDate()}日`;
  }

  return `${formatDateCN(start)} – ${formatDateCN(end)}`;
}

/**
 * Format time as "HH:mm"
 */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Format a time range: "09:00 – 10:30"
 */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/**
 * Format as ISO date string "YYYY-MM-DD"
 */
export function toISODateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// --------------------------------------------------
// Comparison
// --------------------------------------------------

/** Check if two dates are the same calendar day */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Check if two dates are in the same month and year */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Check if a date falls between start and end (inclusive) */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = startOfDay(date).getTime();
  return d >= startOfDay(start).getTime() && d <= startOfDay(end).getTime();
}

/** Check if a date is before another (day-level comparison) */
export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

/** Check if a date is after another (day-level comparison) */
export function isAfter(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

/** Check if a date is today */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// --------------------------------------------------
// Start / End helpers
// --------------------------------------------------

/** Return a new Date set to 00:00:00.000 of the same day */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return a new Date set to 23:59:59.999 of the same day */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Return a new Date set to the start of the week containing `date`.
 * @param weekStartDay 0 = Sunday, 1 = Monday, etc. Defaults to 1 (Monday).
 */
export function startOfWeek(date: Date, weekStartDay: number = 1): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Return a new Date set to the end (23:59:59.999) of the last day
 * of the week containing `date`.
 * @param weekStartDay 0 = Sunday, 1 = Monday, etc. Defaults to 1 (Monday).
 */
export function endOfWeek(date: Date, weekStartDay: number = 1): Date {
  const d = startOfWeek(date, weekStartDay);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
}

/** Return a new Date set to the first day of the month, 00:00:00.000 */
export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return a new Date set to the last day of the month, 23:59:59.999 */
export function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

// --------------------------------------------------
// Duration / arithmetic
// --------------------------------------------------

/** Add the specified number of days and return a new Date */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Add the specified number of months and return a new Date */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Calculate the duration in minutes between two dates.
 * Returns a positive number if end > start.
 */
export function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

/**
 * Get all dates in a range [start, end] (inclusive, day-level).
 * Returns an array of Date objects set to startOfDay.
 */
export function getDatesInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(start);
  const last = startOfDay(end).getTime();
  while (current.getTime() <= last) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }
  return dates;
}
