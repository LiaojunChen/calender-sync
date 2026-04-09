// ============================================================
// Recurrence Rule Utilities
// ============================================================
// Uses the `rrule` library (RFC 5545) to build, describe, and
// expand recurring event instances.
// ============================================================

import { RRule, RRuleSet } from 'rrule';

// ============================================================
// Types
// ============================================================

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'weekdays'
  | 'custom';

export interface RecurrenceOptions {
  frequency: RecurrenceFrequency;
  /** Every N days/weeks/months/years (default: 1) */
  interval?: number;
  /** Day-of-week numbers: 0=MO, 1=TU, 2=WE, 3=TH, 4=FR, 5=SA, 6=SU */
  byweekday?: number[];
  /** Repeat until this date (exclusive of time) */
  until?: Date;
  /** End after N occurrences */
  count?: number;
}

export interface RecurrenceInstance {
  /** 'YYYY-MM-DD' — which calendar date this instance falls on */
  instanceDate: string;
  /** Actual start datetime for this instance */
  start: Date;
  /** Actual end datetime for this instance */
  end: Date;
  isException: boolean;
  exceptionAction?: 'skip' | 'modify';
  modified?: {
    title?: string;
    start_time?: string;
    end_time?: string;
  };
}

// ============================================================
// Internal helpers
// ============================================================

// rrule weekday constants (RRule.MO … RRule.SU)
const RRULE_WEEKDAYS = [
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
  RRule.SU,
];

const WEEKDAY_CN = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function freqToRRuleFreq(freq: RecurrenceFrequency): number {
  switch (freq) {
    case 'daily':
    case 'weekdays':
      return RRule.DAILY;
    case 'weekly':
      return RRule.WEEKLY;
    case 'monthly':
      return RRule.MONTHLY;
    case 'yearly':
      return RRule.YEARLY;
    case 'custom':
      return RRule.DAILY; // fallback; caller should set interval/byweekday
    default:
      return RRule.DAILY;
  }
}

/** Format a Date to 'YYYY-MM-DD' using UTC date components (rrule returns UTC). */
function toDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ============================================================
// buildRruleString
// ============================================================

/**
 * Build an RFC 5545 RRULE string from high-level options.
 *
 * Examples:
 *   { frequency: 'daily' }            → "FREQ=DAILY"
 *   { frequency: 'weekdays' }         → "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
 *   { frequency: 'weekly', byweekday: [0,2,4] } → "FREQ=WEEKLY;BYDAY=MO,WE,FR"
 *   { frequency: 'monthly', count: 6 } → "FREQ=MONTHLY;COUNT=6"
 */
export function buildRruleString(options: RecurrenceOptions): string {
  const { frequency, interval, byweekday, until, count } = options;

  // Determine byweekday
  let byday: import('rrule').Weekday[] | undefined;
  if (frequency === 'weekdays') {
    byday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
  } else if (byweekday && byweekday.length > 0) {
    byday = byweekday.map((n) => RRULE_WEEKDAYS[n % 7]);
  }

  const rruleOptions: ConstructorParameters<typeof RRule>[0] = {
    freq: freqToRRuleFreq(frequency),
    interval: interval && interval > 1 ? interval : undefined,
    byweekday: byday,
    until: until,
    count: count,
  };

  const rule = new RRule(rruleOptions);
  // rrule.toString() returns "DTSTART:...\nRRULE:FREQ=..."
  // We only want the RRULE part
  const full = rule.toString();
  const match = full.match(/RRULE:(.+)/);
  return match ? match[1] : full;
}

// ============================================================
// describeRrule
// ============================================================

/**
 * Convert an RRULE string to a human-readable Chinese description.
 *
 * Examples:
 *   "FREQ=DAILY"                        → "每天"
 *   "FREQ=DAILY;INTERVAL=2"             → "每 2 天"
 *   "FREQ=WEEKLY;BYDAY=MO,WE,FR"        → "每周 周一、周三、周五"
 *   "FREQ=WEEKLY"                       → "每周"
 *   "FREQ=MONTHLY"                      → "每月"
 *   "FREQ=MONTHLY;COUNT=10"             → "每月，共 10 次"
 *   "FREQ=YEARLY"                       → "每年"
 *   "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" → "每工作日"
 */
export function describeRrule(rruleString: string): string {
  // Parse the string (rrule requires "RRULE:" prefix for fromString)
  let rule: RRule;
  try {
    // Support both "FREQ=..." and "RRULE:FREQ=..."
    const src = rruleString.startsWith('RRULE:')
      ? rruleString
      : `RRULE:${rruleString}`;
    rule = RRule.fromString(src);
  } catch {
    return rruleString;
  }

  const opts = rule.options;
  const interval = opts.interval ?? 1;
  const count = opts.count;
  const until = opts.until;

  // Detect weekdays-only pattern
  const byday = opts.byweekday as number[] | null;
  const isWeekdays =
    opts.freq === RRule.WEEKLY &&
    byday &&
    byday.length === 5 &&
    [0, 1, 2, 3, 4].every((d) => byday.includes(d));

  let base: string;

  if (isWeekdays) {
    base = '每工作日';
  } else {
    switch (opts.freq) {
      case RRule.DAILY:
        base = interval === 1 ? '每天' : `每 ${interval} 天`;
        break;
      case RRule.WEEKLY: {
        let dayPart = '';
        if (byday && byday.length > 0) {
          dayPart = ' ' + byday.map((d) => WEEKDAY_CN[d] ?? '').join('、');
        }
        base =
          interval === 1 ? `每周${dayPart}` : `每 ${interval} 周${dayPart}`;
        break;
      }
      case RRule.MONTHLY:
        base = interval === 1 ? '每月' : `每 ${interval} 个月`;
        break;
      case RRule.YEARLY:
        base = interval === 1 ? '每年' : `每 ${interval} 年`;
        break;
      default:
        base = '自定义';
    }
  }

  // Append end condition
  if (count) {
    return `${base}，共 ${count} 次`;
  }
  if (until) {
    const y = until.getUTCFullYear();
    const m = until.getUTCMonth() + 1;
    const d = until.getUTCDate();
    return `${base}，至 ${y}年${m}月${d}日`;
  }
  return base;
}

// ============================================================
// expandRecurrenceInstances
// ============================================================

export interface ExceptionInput {
  original_date: string;
  action: 'skip' | 'modify';
  modified_start_time?: string | null;
  modified_end_time?: string | null;
  modified_title?: string | null;
}

/**
 * Expand a recurring event into concrete instances within [rangeStart, rangeEnd].
 *
 * - Uses UTC-based iteration from rrule (dates come back as UTC midnight).
 * - The time-of-day is taken from eventStartTime / eventEndTime and applied
 *   to each occurrence date in **local** time.
 * - Skipped exceptions are excluded from the result.
 * - Modified exceptions use overridden values.
 */
export function expandRecurrenceInstances(
  rruleString: string,
  eventStartTime: Date,
  eventEndTime: Date,
  rangeStart: Date,
  rangeEnd: Date,
  exceptions?: ExceptionInput[],
): RecurrenceInstance[] {
  // Build exception map keyed by 'YYYY-MM-DD'
  const exMap = new Map<string, ExceptionInput>();
  if (exceptions) {
    for (const ex of exceptions) {
      exMap.set(ex.original_date, ex);
    }
  }

  // Duration of the event in ms
  const durationMs = eventEndTime.getTime() - eventStartTime.getTime();

  // Hours/minutes of day from the original event (in local time)
  const startHour = eventStartTime.getHours();
  const startMin = eventStartTime.getMinutes();
  const startSec = eventStartTime.getSeconds();

  // Build rrule — we need a DTSTART so rrule iterates from the event origin
  let rule: RRule;
  try {
    // Use the event's date as DTSTART (UTC noon to avoid DST ambiguity)
    const dtstart = new Date(
      Date.UTC(
        eventStartTime.getFullYear(),
        eventStartTime.getMonth(),
        eventStartTime.getDate(),
        12, 0, 0,
      ),
    );
    const src = rruleString.startsWith('RRULE:')
      ? rruleString
      : `RRULE:${rruleString}`;
    const base = RRule.fromString(src);
    rule = new RRule({ ...base.options, dtstart });
  } catch {
    return [];
  }

  // Expand within range — add 1-day buffers to be safe with DST
  const queryStart = new Date(rangeStart);
  queryStart.setDate(queryStart.getDate() - 1);
  const queryEnd = new Date(rangeEnd);
  queryEnd.setDate(queryEnd.getDate() + 1);

  // rrule.between returns UTC dates
  const occurrences = rule.between(queryStart, queryEnd, true);

  const results: RecurrenceInstance[] = [];

  for (const occ of occurrences) {
    // occ is a UTC date at 12:00 noon (our dtstart hour)
    const dateStr = toDateStr(occ);

    // Build the actual local-time start for this instance
    const instanceStart = new Date(
      occ.getUTCFullYear(),
      occ.getUTCMonth(),
      occ.getUTCDate(),
      startHour,
      startMin,
      startSec,
      0,
    );
    const instanceEnd = new Date(instanceStart.getTime() + durationMs);

    // Check range again in local time
    if (instanceStart > rangeEnd || instanceEnd < rangeStart) {
      continue;
    }

    const ex = exMap.get(dateStr);

    if (ex?.action === 'skip') {
      // Exclude skipped instances entirely
      continue;
    }

    if (ex?.action === 'modify') {
      const modifiedStart = ex.modified_start_time
        ? new Date(ex.modified_start_time)
        : instanceStart;
      const modifiedEnd = ex.modified_end_time
        ? new Date(ex.modified_end_time)
        : instanceEnd;

      results.push({
        instanceDate: dateStr,
        start: modifiedStart,
        end: modifiedEnd,
        isException: true,
        exceptionAction: 'modify',
        modified: {
          title: ex.modified_title ?? undefined,
          start_time: ex.modified_start_time ?? undefined,
          end_time: ex.modified_end_time ?? undefined,
        },
      });
    } else {
      results.push({
        instanceDate: dateStr,
        start: instanceStart,
        end: instanceEnd,
        isException: false,
      });
    }
  }

  return results;
}
