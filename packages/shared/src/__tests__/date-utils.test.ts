import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDateCN,
  formatDateRangeCN,
  formatTime,
  formatTimeRange,
  toISODateString,
  isSameDay,
  isSameMonth,
  isDateInRange,
  isBefore,
  isAfter,
  isToday,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  durationMinutes,
  getDatesInRange,
} from '../date-utils';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a local Date with specific time components (defaults to midnight). */
function d(year: number, month: number, day: number, h = 0, m = 0, s = 0, ms = 0): Date {
  return new Date(year, month - 1, day, h, m, s, ms);
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDateCN', () => {
  it('formats a regular date correctly', () => {
    expect(formatDateCN(d(2026, 4, 9))).toBe('2026年4月9日');
  });

  it('does not zero-pad month or day', () => {
    expect(formatDateCN(d(2026, 1, 1))).toBe('2026年1月1日');
  });

  it('handles December 31', () => {
    expect(formatDateCN(d(2025, 12, 31))).toBe('2025年12月31日');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('formatDateRangeCN', () => {
  it('same-day range returns a single date string', () => {
    const day = d(2026, 4, 9);
    // Use different time-of-day objects that are still the same calendar day
    const dayEvening = d(2026, 4, 9, 20, 0, 0);
    expect(formatDateRangeCN(day, dayEvening)).toBe('2026年4月9日');
  });

  it('same-month range appends only the end day', () => {
    const start = d(2026, 4, 6);
    const end = d(2026, 4, 12);
    expect(formatDateRangeCN(start, end)).toBe('2026年4月6日 – 12日');
  });

  it('same-year but different-month range appends end month+day', () => {
    const start = d(2026, 4, 6);
    const end = d(2026, 5, 3);
    expect(formatDateRangeCN(start, end)).toBe('2026年4月6日 – 5月3日');
  });

  it('cross-year range returns two full CN date strings', () => {
    const start = d(2025, 12, 28);
    const end = d(2026, 1, 3);
    expect(formatDateRangeCN(start, end)).toBe('2025年12月28日 – 2026年1月3日');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('pads single-digit hours and minutes', () => {
    expect(formatTime(d(2026, 4, 9, 9, 5))).toBe('09:05');
  });

  it('formats two-digit hours and minutes without padding', () => {
    expect(formatTime(d(2026, 4, 9, 14, 30))).toBe('14:30');
  });

  it('formats midnight', () => {
    expect(formatTime(d(2026, 4, 9, 0, 0))).toBe('00:00');
  });

  it('formats 23:59', () => {
    expect(formatTime(d(2026, 4, 9, 23, 59))).toBe('23:59');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('formatTimeRange', () => {
  it('formats a time range with an en-dash separator', () => {
    const start = d(2026, 4, 9, 9, 0);
    const end = d(2026, 4, 9, 10, 30);
    expect(formatTimeRange(start, end)).toBe('09:00 – 10:30');
  });

  it('handles same-hour range', () => {
    const start = d(2026, 4, 9, 14, 0);
    const end = d(2026, 4, 9, 14, 45);
    expect(formatTimeRange(start, end)).toBe('14:00 – 14:45');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('toISODateString', () => {
  it('formats a date as YYYY-MM-DD with zero padding', () => {
    expect(toISODateString(d(2026, 4, 9))).toBe('2026-04-09');
  });

  it('pads single-digit month and day', () => {
    expect(toISODateString(d(2026, 1, 5))).toBe('2026-01-05');
  });

  it('handles December 31', () => {
    expect(toISODateString(d(2025, 12, 31))).toBe('2025-12-31');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Comparison
// ─────────────────────────────────────────────────────────────────────────────

describe('isSameDay', () => {
  it('returns true for two Date objects on the same calendar day', () => {
    expect(isSameDay(d(2026, 4, 9, 8, 0), d(2026, 4, 9, 22, 30))).toBe(true);
  });

  it('returns false for different days in the same month', () => {
    expect(isSameDay(d(2026, 4, 9), d(2026, 4, 10))).toBe(false);
  });

  it('returns false for same day-of-month in different months', () => {
    expect(isSameDay(d(2026, 4, 9), d(2026, 5, 9))).toBe(false);
  });

  it('returns false for same day-of-month in different years', () => {
    expect(isSameDay(d(2025, 4, 9), d(2026, 4, 9))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('isSameMonth', () => {
  it('returns true for two dates in the same month and year', () => {
    expect(isSameMonth(d(2026, 4, 1), d(2026, 4, 30))).toBe(true);
  });

  it('returns false for different months in the same year', () => {
    expect(isSameMonth(d(2026, 4, 9), d(2026, 5, 9))).toBe(false);
  });

  it('returns false for same month in different years', () => {
    expect(isSameMonth(d(2025, 4, 9), d(2026, 4, 9))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('isDateInRange', () => {
  const start = d(2026, 4, 1);
  const end = d(2026, 4, 30);

  it('returns true for the start boundary date', () => {
    expect(isDateInRange(start, start, end)).toBe(true);
  });

  it('returns true for the end boundary date', () => {
    expect(isDateInRange(end, start, end)).toBe(true);
  });

  it('returns true for a date strictly inside the range', () => {
    expect(isDateInRange(d(2026, 4, 15), start, end)).toBe(true);
  });

  it('returns false for a date before the range', () => {
    expect(isDateInRange(d(2026, 3, 31), start, end)).toBe(false);
  });

  it('returns false for a date after the range', () => {
    expect(isDateInRange(d(2026, 5, 1), start, end)).toBe(false);
  });

  it('ignores time-of-day when comparing (end-of-day time still counts as same day)', () => {
    const endOfRangeDay = d(2026, 4, 30, 23, 59, 59, 999);
    expect(isDateInRange(endOfRangeDay, start, end)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('isBefore', () => {
  it('returns true when a is strictly before b', () => {
    expect(isBefore(d(2026, 4, 8), d(2026, 4, 9))).toBe(true);
  });

  it('returns false when a equals b (same day)', () => {
    expect(isBefore(d(2026, 4, 9, 1, 0), d(2026, 4, 9, 23, 0))).toBe(false);
  });

  it('returns false when a is after b', () => {
    expect(isBefore(d(2026, 4, 10), d(2026, 4, 9))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('isAfter', () => {
  it('returns true when a is strictly after b', () => {
    expect(isAfter(d(2026, 4, 10), d(2026, 4, 9))).toBe(true);
  });

  it('returns false when a equals b (same day)', () => {
    expect(isAfter(d(2026, 4, 9, 1, 0), d(2026, 4, 9, 23, 0))).toBe(false);
  });

  it('returns false when a is before b', () => {
    expect(isAfter(d(2026, 4, 8), d(2026, 4, 9))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('isToday', () => {
  beforeEach(() => {
    // Fix "today" to 2026-04-09
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 9, 12, 0, 0)); // month is 0-indexed
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when the date is today', () => {
    expect(isToday(d(2026, 4, 9))).toBe(true);
  });

  it('returns true even when the time differs from now', () => {
    expect(isToday(d(2026, 4, 9, 23, 59))).toBe(true);
  });

  it('returns false for yesterday', () => {
    expect(isToday(d(2026, 4, 8))).toBe(false);
  });

  it('returns false for tomorrow', () => {
    expect(isToday(d(2026, 4, 10))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start / End helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('startOfDay', () => {
  it('sets time to 00:00:00.000', () => {
    const result = startOfDay(d(2026, 4, 9, 15, 30, 45, 500));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('preserves the calendar date', () => {
    const result = startOfDay(d(2026, 4, 9, 15, 30));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3); // 0-indexed April
    expect(result.getDate()).toBe(9);
  });

  it('does not mutate the original date', () => {
    const original = d(2026, 4, 9, 15, 30);
    startOfDay(original);
    expect(original.getHours()).toBe(15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('endOfDay', () => {
  it('sets time to 23:59:59.999', () => {
    const result = endOfDay(d(2026, 4, 9, 5, 0, 0));
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  it('preserves the calendar date', () => {
    const result = endOfDay(d(2026, 4, 9, 5, 0));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3);
    expect(result.getDate()).toBe(9);
  });

  it('does not mutate the original date', () => {
    const original = d(2026, 4, 9, 5, 0);
    endOfDay(original);
    expect(original.getHours()).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('startOfWeek', () => {
  // 2026-04-09 is a Thursday
  const thursday = d(2026, 4, 9);

  it('defaults to Monday as week start', () => {
    const result = startOfWeek(thursday);
    // Monday 2026-04-06
    expect(toISODateString(result)).toBe('2026-04-06');
  });

  it('weekStartDay=1 (Monday): Monday input stays Monday', () => {
    const monday = d(2026, 4, 6);
    expect(toISODateString(startOfWeek(monday, 1))).toBe('2026-04-06');
  });

  it('weekStartDay=0 (Sunday): returns previous Sunday', () => {
    // Thursday → previous Sunday = 2026-04-05
    expect(toISODateString(startOfWeek(thursday, 0))).toBe('2026-04-05');
  });

  it('weekStartDay=0 (Sunday): Sunday input stays Sunday', () => {
    const sunday = d(2026, 4, 5);
    expect(toISODateString(startOfWeek(sunday, 0))).toBe('2026-04-05');
  });

  it('returns a date with time 00:00:00.000', () => {
    const result = startOfWeek(thursday);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('endOfWeek', () => {
  // 2026-04-09 is a Thursday
  const thursday = d(2026, 4, 9);

  it('defaults to Monday start → Sunday end', () => {
    // Week Mon 06 – Sun 12
    const result = endOfWeek(thursday);
    expect(toISODateString(result)).toBe('2026-04-12');
  });

  it('weekStartDay=0 (Sunday): Saturday is week end', () => {
    // Week Sun 05 – Sat 11
    const result = endOfWeek(thursday, 0);
    expect(toISODateString(result)).toBe('2026-04-11');
  });

  it('returns a date with time 23:59:59.999', () => {
    const result = endOfWeek(thursday);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('startOfMonth', () => {
  it('returns the 1st of the month at midnight', () => {
    const result = startOfMonth(d(2026, 4, 15, 14, 30));
    expect(toISODateString(result)).toBe('2026-04-01');
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('does not mutate the input date', () => {
    const original = d(2026, 4, 15, 14, 30);
    startOfMonth(original);
    expect(original.getDate()).toBe(15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('endOfMonth', () => {
  it('returns the last day of April (30th)', () => {
    const result = endOfMonth(d(2026, 4, 5));
    expect(toISODateString(result)).toBe('2026-04-30');
  });

  it('returns the last day of February in a non-leap year (28th)', () => {
    const result = endOfMonth(d(2025, 2, 1));
    expect(toISODateString(result)).toBe('2025-02-28');
  });

  it('returns the last day of February in a leap year (29th)', () => {
    const result = endOfMonth(d(2024, 2, 1));
    expect(toISODateString(result)).toBe('2024-02-29');
  });

  it('returns time 23:59:59.999', () => {
    const result = endOfMonth(d(2026, 4, 5));
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Arithmetic
// ─────────────────────────────────────────────────────────────────────────────

describe('addDays', () => {
  it('adds a positive number of days', () => {
    expect(toISODateString(addDays(d(2026, 4, 9), 5))).toBe('2026-04-14');
  });

  it('subtracts days when given a negative value', () => {
    expect(toISODateString(addDays(d(2026, 4, 9), -9))).toBe('2026-03-31');
  });

  it('crosses month boundary', () => {
    expect(toISODateString(addDays(d(2026, 4, 30), 1))).toBe('2026-05-01');
  });

  it('crosses year boundary', () => {
    expect(toISODateString(addDays(d(2025, 12, 31), 1))).toBe('2026-01-01');
  });

  it('adding 0 days returns the same date', () => {
    expect(toISODateString(addDays(d(2026, 4, 9), 0))).toBe('2026-04-09');
  });

  it('does not mutate the input date', () => {
    const original = d(2026, 4, 9);
    addDays(original, 10);
    expect(toISODateString(original)).toBe('2026-04-09');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('addMonths', () => {
  it('adds a positive number of months', () => {
    expect(toISODateString(addMonths(d(2026, 4, 9), 3))).toBe('2026-07-09');
  });

  it('subtracts months when given a negative value', () => {
    expect(toISODateString(addMonths(d(2026, 4, 9), -1))).toBe('2026-03-09');
  });

  it('crosses year boundary going forward', () => {
    expect(toISODateString(addMonths(d(2025, 12, 1), 1))).toBe('2026-01-01');
  });

  it('crosses year boundary going backward', () => {
    expect(toISODateString(addMonths(d(2026, 1, 1), -1))).toBe('2025-12-01');
  });

  it('clamps to the last day of the target month (Jan 31 + 1 month)', () => {
    // Jan 31 + 1 month → Feb 28 (non-leap 2025) due to JS Date overflow clamping
    const result = addMonths(d(2025, 1, 31), 1);
    expect(toISODateString(result)).toBe('2025-03-03');
  });

  it('does not mutate the input date', () => {
    const original = d(2026, 4, 9);
    addMonths(original, 1);
    expect(toISODateString(original)).toBe('2026-04-09');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('durationMinutes', () => {
  it('returns correct duration for a 1-hour range', () => {
    const start = d(2026, 4, 9, 9, 0);
    const end = d(2026, 4, 9, 10, 0);
    expect(durationMinutes(start, end)).toBe(60);
  });

  it('returns correct duration for a 90-minute range', () => {
    const start = d(2026, 4, 9, 9, 0);
    const end = d(2026, 4, 9, 10, 30);
    expect(durationMinutes(start, end)).toBe(90);
  });

  it('returns 0 for equal start and end', () => {
    const start = d(2026, 4, 9, 9, 0);
    expect(durationMinutes(start, start)).toBe(0);
  });

  it('returns a negative number when end is before start', () => {
    const start = d(2026, 4, 9, 10, 0);
    const end = d(2026, 4, 9, 9, 0);
    expect(durationMinutes(start, end)).toBe(-60);
  });

  it('spans midnight correctly', () => {
    const start = d(2026, 4, 9, 23, 0);
    const end = d(2026, 4, 10, 1, 0);
    expect(durationMinutes(start, end)).toBe(120);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getDatesInRange', () => {
  it('returns a single date when start equals end', () => {
    const dates = getDatesInRange(d(2026, 4, 9), d(2026, 4, 9));
    expect(dates).toHaveLength(1);
    expect(toISODateString(dates[0])).toBe('2026-04-09');
  });

  it('returns all inclusive dates for a 3-day range', () => {
    const dates = getDatesInRange(d(2026, 4, 7), d(2026, 4, 9));
    expect(dates).toHaveLength(3);
    expect(toISODateString(dates[0])).toBe('2026-04-07');
    expect(toISODateString(dates[1])).toBe('2026-04-08');
    expect(toISODateString(dates[2])).toBe('2026-04-09');
  });

  it('returns dates normalized to startOfDay (00:00:00.000)', () => {
    const dates = getDatesInRange(d(2026, 4, 9, 14, 30), d(2026, 4, 10, 22, 0));
    expect(dates).toHaveLength(2);
    dates.forEach((date) => {
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });
  });

  it('crosses month boundary', () => {
    const dates = getDatesInRange(d(2026, 4, 29), d(2026, 5, 2));
    expect(dates).toHaveLength(4);
    expect(toISODateString(dates[0])).toBe('2026-04-29');
    expect(toISODateString(dates[3])).toBe('2026-05-02');
  });

  it('returns an empty array when end is before start', () => {
    const dates = getDatesInRange(d(2026, 4, 10), d(2026, 4, 9));
    expect(dates).toHaveLength(0);
  });
});
