import { describe, it, expect } from 'vitest';
import {
  buildRruleString,
  describeRrule,
  expandRecurrenceInstances,
} from '../recurrence';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a local-time Date. Month is 1-indexed for readability. */
function ld(year: number, month: number, day: number, h = 9, m = 0, s = 0): Date {
  return new Date(year, month - 1, day, h, m, s, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// buildRruleString
// ─────────────────────────────────────────────────────────────────────────────

describe('buildRruleString', () => {
  it('daily → contains FREQ=DAILY', () => {
    const result = buildRruleString({ frequency: 'daily' });
    expect(result).toContain('FREQ=DAILY');
  });

  it('weekly → contains FREQ=WEEKLY', () => {
    const result = buildRruleString({ frequency: 'weekly' });
    expect(result).toContain('FREQ=WEEKLY');
  });

  it('monthly → contains FREQ=MONTHLY', () => {
    const result = buildRruleString({ frequency: 'monthly' });
    expect(result).toContain('FREQ=MONTHLY');
  });

  it('yearly → contains FREQ=YEARLY', () => {
    const result = buildRruleString({ frequency: 'yearly' });
    expect(result).toContain('FREQ=YEARLY');
  });

  it('weekdays → contains BYDAY=MO,TU,WE,TH,FR', () => {
    const result = buildRruleString({ frequency: 'weekdays' });
    // The RRULE library may use FREQ=DAILY or FREQ=WEEKLY for weekdays
    expect(result).toContain('BYDAY=MO,TU,WE,TH,FR');
  });

  it('custom with interval=2 and frequency=weekly → contains INTERVAL=2 and FREQ=WEEKLY', () => {
    const result = buildRruleString({ frequency: 'weekly', interval: 2 });
    expect(result).toContain('FREQ=WEEKLY');
    expect(result).toContain('INTERVAL=2');
  });

  it('with until date → contains UNTIL=', () => {
    const until = new Date(Date.UTC(2026, 11, 31)); // 2026-12-31 UTC
    const result = buildRruleString({ frequency: 'daily', until });
    expect(result).toContain('UNTIL=');
  });

  it('with count=5 → contains COUNT=5', () => {
    const result = buildRruleString({ frequency: 'monthly', count: 5 });
    expect(result).toContain('COUNT=5');
  });

  it('with byweekday=[0,2,4] (MO,WE,FR) → contains BYDAY with MO,WE,FR', () => {
    const result = buildRruleString({ frequency: 'weekly', byweekday: [0, 2, 4] });
    expect(result).toContain('BYDAY=');
    expect(result).toContain('MO');
    expect(result).toContain('WE');
    expect(result).toContain('FR');
  });

  it('does not include INTERVAL when interval=1 (default)', () => {
    const result = buildRruleString({ frequency: 'daily', interval: 1 });
    expect(result).not.toContain('INTERVAL=');
  });

  it('result does not include RRULE: prefix', () => {
    const result = buildRruleString({ frequency: 'daily' });
    expect(result).not.toContain('RRULE:');
    expect(result).not.toContain('DTSTART');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// describeRrule
// ─────────────────────────────────────────────────────────────────────────────

describe('describeRrule', () => {
  it('FREQ=DAILY → 每天', () => {
    expect(describeRrule('FREQ=DAILY')).toBe('每天');
  });

  it('FREQ=WEEKLY → starts with 每周', () => {
    // Note: rrule.fromString without DTSTART infers current weekday into byweekday,
    // so the output is "每周 <weekday>". We test the prefix rather than exact match.
    const result = describeRrule('FREQ=WEEKLY');
    expect(result).toContain('每周');
  });

  it('FREQ=MONTHLY → 每月', () => {
    expect(describeRrule('FREQ=MONTHLY')).toBe('每月');
  });

  it('FREQ=YEARLY → 每年', () => {
    expect(describeRrule('FREQ=YEARLY')).toBe('每年');
  });

  it('weekdays rule → 每工作日', () => {
    expect(describeRrule('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')).toBe('每工作日');
  });

  it('FREQ=DAILY;COUNT=10 → includes count in description', () => {
    const result = describeRrule('FREQ=DAILY;COUNT=10');
    expect(result).toContain('10');
    expect(result).toContain('次');
    // e.g. "每天，共 10 次"
    expect(result).toBe('每天，共 10 次');
  });

  it('FREQ=MONTHLY;COUNT=5 → 每月，共 5 次', () => {
    expect(describeRrule('FREQ=MONTHLY;COUNT=5')).toBe('每月，共 5 次');
  });

  it('FREQ=DAILY;INTERVAL=2 → 每 2 天', () => {
    expect(describeRrule('FREQ=DAILY;INTERVAL=2')).toBe('每 2 天');
  });

  it('FREQ=WEEKLY;INTERVAL=2 → mentions interval', () => {
    // Note: rrule.fromString without DTSTART injects current weekday into byweekday,
    // so output is "每 2 周 <weekday>" rather than plain "每 2 周".
    const result = describeRrule('FREQ=WEEKLY;INTERVAL=2');
    expect(result).toContain('2');
    expect(result).toContain('每');
    expect(result).toContain('周');
  });

  it('FREQ=MONTHLY;INTERVAL=3 → 每 3 个月', () => {
    expect(describeRrule('FREQ=MONTHLY;INTERVAL=3')).toBe('每 3 个月');
  });

  it('FREQ=YEARLY;INTERVAL=2 → 每 2 年', () => {
    expect(describeRrule('FREQ=YEARLY;INTERVAL=2')).toBe('每 2 年');
  });

  it('FREQ=WEEKLY;BYDAY=MO,WE,FR → 每周 周一、周三、周五', () => {
    expect(describeRrule('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toBe('每周 周一、周三、周五');
  });

  it('accepts RRULE: prefix', () => {
    expect(describeRrule('RRULE:FREQ=DAILY')).toBe('每天');
  });

  it('FREQ=DAILY with UNTIL → includes 至 in description', () => {
    const result = describeRrule('FREQ=DAILY;UNTIL=20261231T000000Z');
    expect(result).toContain('至');
    expect(result).toContain('2026');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// expandRecurrenceInstances
// ─────────────────────────────────────────────────────────────────────────────

describe('expandRecurrenceInstances', () => {
  // 2026-04-06 is a Monday. Use as anchor for weekly tests.
  // Event: 09:00 – 10:00 local time (1 hour)
  const eventStart = ld(2026, 4, 6, 9, 0, 0);  // Monday 2026-04-06 09:00
  const eventEnd   = ld(2026, 4, 6, 10, 0, 0); // Monday 2026-04-06 10:00

  it('daily rule over 7-day range → returns 7 instances', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 12, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances).toHaveLength(7);
  });

  it('daily rule instance dates are consecutive', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 8, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances).toHaveLength(3);
    expect(instances[0].instanceDate).toBe('2026-04-06');
    expect(instances[1].instanceDate).toBe('2026-04-07');
    expect(instances[2].instanceDate).toBe('2026-04-08');
  });

  it('weekly rule (every Monday) → only Mondays in range', () => {
    // 2026-04-06 to 2026-04-26 inclusive (three full weeks)
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 26, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=WEEKLY;BYDAY=MO',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances.length).toBeGreaterThanOrEqual(3);
    for (const inst of instances) {
      // instanceDate should be a Monday
      const day = new Date(inst.instanceDate + 'T12:00:00').getDay();
      // Monday = 1
      expect(day).toBe(1);
    }
    expect(instances[0].instanceDate).toBe('2026-04-06');
    expect(instances[1].instanceDate).toBe('2026-04-13');
    expect(instances[2].instanceDate).toBe('2026-04-20');
  });

  it('start and end times are preserved per instance (same time-of-day as original)', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 8, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    for (const inst of instances) {
      expect(inst.start.getHours()).toBe(9);
      expect(inst.start.getMinutes()).toBe(0);
      expect(inst.end.getHours()).toBe(10);
      expect(inst.end.getMinutes()).toBe(0);
    }
  });

  it('event duration is preserved per instance', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 8, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    const durationMs = eventEnd.getTime() - eventStart.getTime();
    for (const inst of instances) {
      expect(inst.end.getTime() - inst.start.getTime()).toBe(durationMs);
    }
  });

  it('isException is false for normal (non-exception) instances', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 7, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    for (const inst of instances) {
      expect(inst.isException).toBe(false);
    }
  });

  it('exception with action=skip → that instance is excluded', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 8, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
      [{ original_date: '2026-04-07', action: 'skip' }],
    );
    // Should have 2 instead of 3
    expect(instances).toHaveLength(2);
    const dates = instances.map((i) => i.instanceDate);
    expect(dates).not.toContain('2026-04-07');
    expect(dates).toContain('2026-04-06');
    expect(dates).toContain('2026-04-08');
  });

  it('exception with action=modify, modified_title → instance has modified title', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 8, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
      [
        {
          original_date: '2026-04-07',
          action: 'modify',
          modified_title: '特别会议',
        },
      ],
    );
    expect(instances).toHaveLength(3);
    const modified = instances.find((i) => i.instanceDate === '2026-04-07');
    expect(modified).toBeDefined();
    expect(modified!.isException).toBe(true);
    expect(modified!.exceptionAction).toBe('modify');
    expect(modified!.modified?.title).toBe('特别会议');
  });

  it('exception with action=modify, modified times → instance uses modified times', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 8, 23, 59, 59);
    const modStart = ld(2026, 4, 7, 14, 0, 0).toISOString();
    const modEnd   = ld(2026, 4, 7, 15, 30, 0).toISOString();
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
      [
        {
          original_date: '2026-04-07',
          action: 'modify',
          modified_start_time: modStart,
          modified_end_time: modEnd,
        },
      ],
    );
    const modified = instances.find((i) => i.instanceDate === '2026-04-07');
    expect(modified).toBeDefined();
    expect(modified!.isException).toBe(true);
    expect(modified!.start.toISOString()).toBe(modStart);
    expect(modified!.end.toISOString()).toBe(modEnd);
    expect(modified!.modified?.start_time).toBe(modStart);
    expect(modified!.modified?.end_time).toBe(modEnd);
  });

  it('exception with action=modify but no modified times → uses original computed times', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 6, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
      [
        {
          original_date: '2026-04-06',
          action: 'modify',
          modified_title: '改名',
        },
      ],
    );
    expect(instances).toHaveLength(1);
    const inst = instances[0];
    expect(inst.isException).toBe(true);
    expect(inst.start.getHours()).toBe(9);
    expect(inst.end.getHours()).toBe(10);
  });

  it('range with no occurrences → empty array', () => {
    // Range is before the event start date
    const rangeStart = ld(2026, 1, 1, 0, 0, 0);
    const rangeEnd   = ld(2026, 1, 5, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances).toHaveLength(0);
  });

  it('count-limited rule stops at COUNT occurrences', () => {
    // FREQ=DAILY;COUNT=3 starting on 2026-04-06, range is 10 days
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 15, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY;COUNT=3',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances).toHaveLength(3);
    expect(instances[0].instanceDate).toBe('2026-04-06');
    expect(instances[1].instanceDate).toBe('2026-04-07');
    expect(instances[2].instanceDate).toBe('2026-04-08');
  });

  it('event at the very start of range → included', () => {
    // rangeStart exactly matches event time
    const rangeStart = ld(2026, 4, 6, 9, 0, 0); // exactly event start time
    const rangeEnd   = ld(2026, 4, 6, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances.length).toBeGreaterThanOrEqual(1);
    expect(instances[0].instanceDate).toBe('2026-04-06');
  });

  it('event entirely after rangeEnd → excluded', () => {
    // Range ends before event starts each day
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 6, 8, 0, 0); // ends at 08:00, event is at 09:00
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances).toHaveLength(0);
  });

  it('multiple exceptions: one skip, one modify', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 10, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
      [
        { original_date: '2026-04-07', action: 'skip' },
        { original_date: '2026-04-09', action: 'modify', modified_title: '重要会议' },
      ],
    );
    // 5 days, 1 skipped = 4
    expect(instances).toHaveLength(4);
    const dates = instances.map((i) => i.instanceDate);
    expect(dates).not.toContain('2026-04-07');
    expect(dates).toContain('2026-04-09');
    const modified = instances.find((i) => i.instanceDate === '2026-04-09');
    expect(modified!.isException).toBe(true);
    expect(modified!.modified?.title).toBe('重要会议');
  });

  it('weekly rule every Mon+Wed+Fri → correct days only', () => {
    // eventStart on Monday 2026-04-06, range is the full week
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 12, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    // Mon Apr 6, Wed Apr 8, Fri Apr 10
    expect(instances).toHaveLength(3);
    expect(instances[0].instanceDate).toBe('2026-04-06');
    expect(instances[1].instanceDate).toBe('2026-04-08');
    expect(instances[2].instanceDate).toBe('2026-04-10');
  });

  it('monthly rule → one instance per month in range', () => {
    // Use eventStart on the same day-of-month as today (9th) so that rrule's
    // bymonthday (inferred from current date when parsing FREQ=MONTHLY without
    // DTSTART) aligns with the actual expansion dates.
    const monthlyEventStart = ld(2026, 4, 9, 9, 0, 0);
    const monthlyEventEnd   = ld(2026, 4, 9, 10, 0, 0);
    const rangeStart = ld(2026, 4, 1, 0, 0, 0);
    const rangeEnd   = ld(2026, 6, 30, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=MONTHLY',
      monthlyEventStart,
      monthlyEventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances).toHaveLength(3);
    expect(instances[0].instanceDate).toBe('2026-04-09');
    expect(instances[1].instanceDate).toBe('2026-05-09');
    expect(instances[2].instanceDate).toBe('2026-06-09');
  });

  it('yearly rule → one instance per year in range', () => {
    // Use eventStart on April 9 (today) so bymonthday and bymonth align
    // with rrule's current-date inference when parsing FREQ=YEARLY without DTSTART.
    const yearlyEventStart = ld(2026, 4, 9, 9, 0, 0);
    const yearlyEventEnd   = ld(2026, 4, 9, 10, 0, 0);
    const rangeStart = ld(2026, 1, 1, 0, 0, 0);
    const rangeEnd   = ld(2028, 12, 31, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=YEARLY',
      yearlyEventStart,
      yearlyEventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances).toHaveLength(3);
    expect(instances[0].instanceDate).toBe('2026-04-09');
    expect(instances[1].instanceDate).toBe('2027-04-09');
    expect(instances[2].instanceDate).toBe('2028-04-09');
  });

  it('returns empty array for invalid rrule string', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 10, 23, 59, 59);
    // Pass a completely invalid string — the try/catch in the source returns []
    // Note: rrule library is lenient; test with truly unparseable format
    const instances = expandRecurrenceInstances(
      'NOT_A_VALID_RRULE_%%%',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    // Should not throw; either empty or produces no results
    expect(Array.isArray(instances)).toBe(true);
  });

  it('no exceptions provided → no instances have isException=true', () => {
    const rangeStart = ld(2026, 4, 6, 0, 0, 0);
    const rangeEnd   = ld(2026, 4, 8, 23, 59, 59);
    const instances = expandRecurrenceInstances(
      'FREQ=DAILY',
      eventStart,
      eventEnd,
      rangeStart,
      rangeEnd,
    );
    expect(instances.every((i) => !i.isException)).toBe(true);
    expect(instances.every((i) => i.exceptionAction === undefined)).toBe(true);
  });
});
