import { describe, expect, it } from 'vitest';
import {
  buildChinaHolidayCalendar,
  CHINA_HOLIDAY_CALENDAR_ID,
  ensureChinaHolidayCalendar,
  getLunarDateDisplay,
} from '../chineseCalendar';

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function toLocalIsoDate(input: string): string {
  const date = new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('getLunarDateDisplay', () => {
  it('shows the lunar month name on the first day of the month', () => {
    expect(getLunarDateDisplay(d(2026, 2, 17))).toBe('正月');
  });

  it('formats single-digit lunar days with 初 prefix', () => {
    expect(getLunarDateDisplay(d(2026, 2, 21))).toBe('初五');
  });

  it('formats day fifteen with standard Chinese wording', () => {
    expect(getLunarDateDisplay(d(2026, 3, 3))).toBe('十五');
  });

  it('formats twenties with 廿 notation', () => {
    expect(getLunarDateDisplay(d(2026, 3, 11))).toBe('廿三');
  });
});

describe('buildChinaHolidayCalendar', () => {
  it('builds the synthetic 中国节假日 calendar once', () => {
    const bundle = buildChinaHolidayCalendar('demo-user');
    const calendars = ensureChinaHolidayCalendar(
      [
        {
          id: 'user-cal-1',
          user_id: 'demo-user',
          name: '个人',
          color: '#039be5',
          is_visible: true,
          is_default: true,
          sort_order: 0,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      'demo-user',
    );

    expect(bundle.calendar.id).toBe(CHINA_HOLIDAY_CALENDAR_ID);
    expect(bundle.calendar.name).toBe('中国节假日');
    expect(calendars.filter((calendar) => calendar.id === CHINA_HOLIDAY_CALENDAR_ID)).toHaveLength(1);
  });

  it('covers 2026 to 2028 and keeps all events on the built-in calendar', () => {
    const bundle = buildChinaHolidayCalendar('demo-user');
    const years = new Set(bundle.events.map((event) => new Date(event.start_time).getFullYear()));

    expect([...years].sort()).toEqual([2026, 2027, 2028]);
    expect(new Set(bundle.events.map((event) => event.calendar_id))).toEqual(
      new Set([CHINA_HOLIDAY_CALENDAR_ID]),
    );
  });

  it('uses the official 2026 holiday ranges for statutory holidays', () => {
    const bundle = buildChinaHolidayCalendar('demo-user');

    const springFestival = bundle.events.find(
      (event) => event.title === '春节' && toLocalIsoDate(event.start_time) === '2026-02-15',
    );
    const midAutumn = bundle.events.find(
      (event) => event.title === '中秋节' && toLocalIsoDate(event.start_time) === '2026-09-25',
    );

    expect(springFestival).toBeDefined();
    expect(toLocalIsoDate(springFestival!.end_time)).toBe('2026-02-23');
    expect(springFestival!.description).toContain('官方放假安排');

    expect(midAutumn).toBeDefined();
    expect(toLocalIsoDate(midAutumn!.end_time)).toBe('2026-09-27');
  });

  it('generates 2027-2028 statutory holidays as festival dates without guessed makeup days', () => {
    const bundle = buildChinaHolidayCalendar('demo-user');

    const springFestival2027 = bundle.events.find(
      (event) => event.title === '春节' && toLocalIsoDate(event.start_time) === '2027-02-07',
    );
    const nationalDay2028 = bundle.events.find(
      (event) => event.title === '国庆节' && toLocalIsoDate(event.start_time) === '2028-10-01',
    );

    expect(springFestival2027).toBeDefined();
    expect(toLocalIsoDate(springFestival2027!.end_time)).toBe('2027-02-07');
    expect(springFestival2027!.description).toContain('未预填调休');

    expect(nationalDay2028).toBeDefined();
    expect(toLocalIsoDate(nationalDay2028!.end_time)).toBe('2028-10-01');
  });

  it('includes major traditional festivals such as 元宵、七夕、重阳、腊八、小年 and 除夕', () => {
    const bundle = buildChinaHolidayCalendar('demo-user');
    const titles = new Set(bundle.events.map((event) => event.title));

    expect(titles).toContain('元宵节');
    expect(titles).toContain('七夕节');
    expect(titles).toContain('重阳节');
    expect(titles).toContain('腊八节');
    expect(titles).toContain('小年（北方）');
    expect(titles).toContain('小年（南方）');
    expect(titles).toContain('除夕');
  });

  it('pins representative traditional festival dates correctly', () => {
    const bundle = buildChinaHolidayCalendar('demo-user');

    const lanternFestival = bundle.events.find(
      (event) => event.title === '元宵节' && toLocalIsoDate(event.start_time) === '2026-03-03',
    );
    const qixiFestival = bundle.events.find(
      (event) => event.title === '七夕节' && toLocalIsoDate(event.start_time) === '2027-08-08',
    );
    const newYearsEve = bundle.events.find(
      (event) => event.title === '除夕' && toLocalIsoDate(event.start_time) === '2028-01-25',
    );

    expect(lanternFestival).toBeDefined();
    expect(qixiFestival).toBeDefined();
    expect(newYearsEve).toBeDefined();
  });
});
