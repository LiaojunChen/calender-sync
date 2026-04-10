import type { Calendar, Event } from './types';

const SYSTEM_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const CHINA_HOLIDAY_CALENDAR_ID = 'builtin-china-holidays';
export const CHINA_HOLIDAY_CALENDAR_NAME = '中国节假日';
export const CHINA_HOLIDAY_YEARS = [2026, 2027, 2028] as const;

const CHINA_HOLIDAY_CALENDAR_COLOR = '#c63c32';

const STANDARD_LUNAR_MONTH_LABELS: Record<number, string> = {
  1: '正月',
  2: '二月',
  3: '三月',
  4: '四月',
  5: '五月',
  6: '六月',
  7: '七月',
  8: '八月',
  9: '九月',
  10: '十月',
  11: '冬月',
  12: '腊月',
};

const LUNAR_DAY_LABELS: Record<number, string> = {
  1: '初一',
  2: '初二',
  3: '初三',
  4: '初四',
  5: '初五',
  6: '初六',
  7: '初七',
  8: '初八',
  9: '初九',
  10: '初十',
  11: '十一',
  12: '十二',
  13: '十三',
  14: '十四',
  15: '十五',
  16: '十六',
  17: '十七',
  18: '十八',
  19: '十九',
  20: '二十',
  21: '廿一',
  22: '廿二',
  23: '廿三',
  24: '廿四',
  25: '廿五',
  26: '廿六',
  27: '廿七',
  28: '廿八',
  29: '廿九',
  30: '三十',
};

const LUNAR_MONTH_ALIASES: Record<string, number> = {
  正月: 1,
  一月: 1,
  二月: 2,
  三月: 3,
  四月: 4,
  五月: 5,
  六月: 6,
  七月: 7,
  八月: 8,
  九月: 9,
  十月: 10,
  冬月: 11,
  十一月: 11,
  腊月: 12,
  十二月: 12,
};

const LUNAR_DAY_ALIASES = Object.fromEntries(
  Object.entries(LUNAR_DAY_LABELS).map(([number, label]) => [label, Number(number)]),
) as Record<string, number>;

const QINGMING_DATES: Record<number, string> = {
  2026: '2026-04-05',
  2027: '2027-04-05',
  2028: '2028-04-04',
};

type OfficialHolidayRange = {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
};

const OFFICIAL_2026_HOLIDAYS: OfficialHolidayRange[] = [
  {
    slug: 'new-year',
    title: '元旦',
    startDate: '2026-01-01',
    endDate: '2026-01-03',
    description: '2026 年官方放假安排（含调休），1 月 4 日上班。',
  },
  {
    slug: 'spring-festival',
    title: '春节',
    startDate: '2026-02-15',
    endDate: '2026-02-23',
    description: '2026 年官方放假安排（含调休），2 月 14 日、2 月 28 日上班。',
  },
  {
    slug: 'qingming',
    title: '清明节',
    startDate: '2026-04-04',
    endDate: '2026-04-06',
    description: '2026 年官方放假安排。',
  },
  {
    slug: 'labor-day',
    title: '劳动节',
    startDate: '2026-05-01',
    endDate: '2026-05-05',
    description: '2026 年官方放假安排（含调休），4 月 26 日上班。',
  },
  {
    slug: 'dragon-boat',
    title: '端午节',
    startDate: '2026-06-19',
    endDate: '2026-06-21',
    description: '2026 年官方放假安排。',
  },
  {
    slug: 'mid-autumn',
    title: '中秋节',
    startDate: '2026-09-25',
    endDate: '2026-09-27',
    description: '2026 年官方放假安排。',
  },
  {
    slug: 'national-day',
    title: '国庆节',
    startDate: '2026-10-01',
    endDate: '2026-10-08',
    description: '2026 年官方放假安排（含调休），9 月 27 日、10 月 10 日上班。',
  },
];

type LunarFestivalDefinition = {
  slug: string;
  title: string;
  lunarMonth: number;
  lunarDay: number;
  description: string;
};

const TRADITIONAL_LUNAR_FESTIVALS: LunarFestivalDefinition[] = [
  {
    slug: 'lantern-festival',
    title: '元宵节',
    lunarMonth: 1,
    lunarDay: 15,
    description: '中国传统节日，按农历推算。',
  },
  {
    slug: 'qixi-festival',
    title: '七夕节',
    lunarMonth: 7,
    lunarDay: 7,
    description: '中国传统节日，按农历推算。',
  },
  {
    slug: 'double-ninth-festival',
    title: '重阳节',
    lunarMonth: 9,
    lunarDay: 9,
    description: '中国传统节日，按农历推算。',
  },
  {
    slug: 'laba-festival',
    title: '腊八节',
    lunarMonth: 12,
    lunarDay: 8,
    description: '中国传统节日，按农历推算。',
  },
  {
    slug: 'little-new-year-north',
    title: '小年（北方）',
    lunarMonth: 12,
    lunarDay: 23,
    description: '中国传统节日，按农历推算。',
  },
  {
    slug: 'little-new-year-south',
    title: '小年（南方）',
    lunarMonth: 12,
    lunarDay: 24,
    description: '中国传统节日，按农历推算。',
  },
];

type StatutoryFestivalDefinition = {
  slug: string;
  title: string;
  resolveDate: (year: number) => Date | null;
};

const STATUTORY_FESTIVALS: StatutoryFestivalDefinition[] = [
  {
    slug: 'new-year',
    title: '元旦',
    resolveDate: (year) => createLocalDateFromIso(`${year}-01-01`),
  },
  {
    slug: 'spring-festival',
    title: '春节',
    resolveDate: (year) => findGregorianDateForLunarDate(year, 1, 1),
  },
  {
    slug: 'qingming',
    title: '清明节',
    resolveDate: (year) => createLocalDateFromIso(QINGMING_DATES[year]),
  },
  {
    slug: 'labor-day',
    title: '劳动节',
    resolveDate: (year) => createLocalDateFromIso(`${year}-05-01`),
  },
  {
    slug: 'dragon-boat',
    title: '端午节',
    resolveDate: (year) => findGregorianDateForLunarDate(year, 5, 5),
  },
  {
    slug: 'mid-autumn',
    title: '中秋节',
    resolveDate: (year) => findGregorianDateForLunarDate(year, 8, 15),
  },
  {
    slug: 'national-day',
    title: '国庆节',
    resolveDate: (year) => createLocalDateFromIso(`${year}-10-01`),
  },
];

type LunarDateParts = {
  monthLabel: string;
  monthNumber: number;
  dayLabel: string;
  dayNumber: number;
  isLeapMonth: boolean;
};

let cachedFormatter: Intl.DateTimeFormat | null = null;
let cachedSupport: boolean | null = null;

function isChineseCalendarSupported(): boolean {
  if (cachedSupport !== null) {
    return cachedSupport;
  }

  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat === 'undefined') {
    cachedSupport = false;
    return cachedSupport;
  }

  try {
    cachedFormatter = new Intl.DateTimeFormat('zh-u-ca-chinese', {
      month: 'short',
      day: 'numeric',
    });
    cachedSupport = true;
  } catch {
    cachedFormatter = null;
    cachedSupport = false;
  }

  return cachedSupport;
}

function getFormatter(): Intl.DateTimeFormat {
  if (!cachedFormatter) {
    cachedFormatter = new Intl.DateTimeFormat('zh-u-ca-chinese', {
      month: 'short',
      day: 'numeric',
    });
  }

  return cachedFormatter;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toIsoDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function createLocalDateFromIso(isoDate: string | undefined): Date | null {
  if (!isoDate) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

function createLocalDateTimeIso(
  isoDate: string,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
): string {
  const date = createLocalDateFromIso(isoDate);
  if (!date) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  date.setHours(hours, minutes, seconds, milliseconds);
  return date.toISOString();
}

function normalizeLunarMonth(rawMonth: string): { monthNumber: number; monthLabel: string; isLeapMonth: boolean } | null {
  const trimmed = rawMonth.trim();
  const isLeapMonth = trimmed.startsWith('闰');
  const withoutLeap = trimmed.replace(/^闰/, '');
  const match = /^(\d{1,2})月$/.exec(withoutLeap);
  const monthNumber = match
    ? Number(match[1])
    : LUNAR_MONTH_ALIASES[withoutLeap];

  if (!monthNumber || !STANDARD_LUNAR_MONTH_LABELS[monthNumber]) {
    return null;
  }

  const monthLabel = isLeapMonth
    ? `闰${STANDARD_LUNAR_MONTH_LABELS[monthNumber]}`
    : STANDARD_LUNAR_MONTH_LABELS[monthNumber];

  return { monthNumber, monthLabel, isLeapMonth };
}

function parseLunarDay(rawDay: string): number | null {
  const trimmed = rawDay.trim().replace(/日$/, '');

  if (/^\d{1,2}$/.test(trimmed)) {
    const dayNumber = Number(trimmed);
    return dayNumber >= 1 && dayNumber <= 30 ? dayNumber : null;
  }

  return LUNAR_DAY_ALIASES[trimmed] ?? null;
}

function getLunarDayLabel(dayNumber: number): string | null {
  return LUNAR_DAY_LABELS[dayNumber] ?? null;
}

function getLunarDateParts(date: Date): LunarDateParts | null {
  if (!isChineseCalendarSupported()) {
    return null;
  }

  try {
    const parts = getFormatter().formatToParts(date);
    const rawMonth = parts.find((part) => part.type === 'month')?.value ?? '';
    const rawDay = parts.find((part) => part.type === 'day')?.value ?? '';

    const monthInfo = normalizeLunarMonth(rawMonth);
    const dayNumber = parseLunarDay(rawDay);
    const dayLabel = dayNumber ? getLunarDayLabel(dayNumber) : null;

    if (!monthInfo || !dayNumber || !dayLabel) {
      return null;
    }

    return {
      monthLabel: monthInfo.monthLabel,
      monthNumber: monthInfo.monthNumber,
      dayLabel,
      dayNumber,
      isLeapMonth: monthInfo.isLeapMonth,
    };
  } catch {
    return null;
  }
}

function findGregorianDateForLunarDate(
  year: number,
  lunarMonth: number,
  lunarDay: number,
): Date | null {
  const cursor = new Date(year, 0, 1, 12, 0, 0, 0);

  for (let index = 0; index < 366; index += 1) {
    const current = new Date(cursor);
    current.setDate(cursor.getDate() + index);

    if (current.getFullYear() !== year) {
      break;
    }

    const lunarParts = getLunarDateParts(current);
    if (!lunarParts || lunarParts.isLeapMonth) {
      continue;
    }

    if (lunarParts.monthNumber === lunarMonth && lunarParts.dayNumber === lunarDay) {
      return current;
    }
  }

  return null;
}

function createAllDayEvent(params: {
  userId: string;
  slug: string;
  year: number;
  title: string;
  startDate: string;
  endDate?: string;
  description: string;
}): Event {
  const endDate = params.endDate ?? params.startDate;

  return {
    id: `china-holiday-${params.year}-${params.slug}`,
    user_id: params.userId,
    calendar_id: CHINA_HOLIDAY_CALENDAR_ID,
    title: params.title,
    description: params.description,
    location: null,
    start_time: createLocalDateTimeIso(params.startDate, 0, 0, 0, 0),
    end_time: createLocalDateTimeIso(endDate, 23, 59, 59, 999),
    is_all_day: true,
    color: null,
    recurrence_rule_id: null,
    deleted_at: null,
    created_at: SYSTEM_TIMESTAMP,
    updated_at: SYSTEM_TIMESTAMP,
  };
}

function buildTraditionalFestivalEvents(userId: string, years: readonly number[]): Event[] {
  const events: Event[] = [];

  for (const year of years) {
    const springFestivalDate = findGregorianDateForLunarDate(year, 1, 1);
    if (springFestivalDate) {
      const newYearsEve = new Date(springFestivalDate);
      newYearsEve.setDate(newYearsEve.getDate() - 1);
      events.push(
        createAllDayEvent({
          userId,
          slug: 'new-years-eve',
          year,
          title: '除夕',
          startDate: toIsoDateString(newYearsEve),
          description: '中国传统节日，按农历推算。',
        }),
      );
    }

    for (const festival of TRADITIONAL_LUNAR_FESTIVALS) {
      const date = findGregorianDateForLunarDate(year, festival.lunarMonth, festival.lunarDay);
      if (!date) {
        continue;
      }

      events.push(
        createAllDayEvent({
          userId,
          slug: festival.slug,
          year,
          title: festival.title,
          startDate: toIsoDateString(date),
          description: festival.description,
        }),
      );
    }
  }

  return events;
}

function buildStatutoryFestivalEvents(userId: string, years: readonly number[]): Event[] {
  const events: Event[] = [];

  for (const year of years) {
    if (year === 2026) {
      for (const holiday of OFFICIAL_2026_HOLIDAYS) {
        events.push(
          createAllDayEvent({
            userId,
            slug: holiday.slug,
            year,
            title: holiday.title,
            startDate: holiday.startDate,
            endDate: holiday.endDate,
            description: holiday.description,
          }),
        );
      }
      continue;
    }

    for (const holiday of STATUTORY_FESTIVALS) {
      const date = holiday.resolveDate(year);
      if (!date) {
        continue;
      }

      events.push(
        createAllDayEvent({
          userId,
          slug: holiday.slug,
          year,
          title: holiday.title,
          startDate: toIsoDateString(date),
          description: `${year} 年仅写入节日本身日期，未预填调休。`,
        }),
      );
    }
  }

  return events;
}

export function getLunarDateDisplay(date: Date): string | null {
  const lunarDateParts = getLunarDateParts(date);
  if (!lunarDateParts) {
    return null;
  }

  return lunarDateParts.dayNumber === 1
    ? lunarDateParts.monthLabel
    : lunarDateParts.dayLabel;
}

export function isChinaHolidayCalendar(calendarId: string): boolean {
  return calendarId === CHINA_HOLIDAY_CALENDAR_ID;
}

export function buildChinaHolidayCalendar(
  userId: string,
  years: readonly number[] = CHINA_HOLIDAY_YEARS,
): { calendar: Calendar; events: Event[] } {
  const normalizedUserId = userId || 'builtin-user';
  const calendar: Calendar = {
    id: CHINA_HOLIDAY_CALENDAR_ID,
    user_id: normalizedUserId,
    name: CHINA_HOLIDAY_CALENDAR_NAME,
    color: CHINA_HOLIDAY_CALENDAR_COLOR,
    is_visible: true,
    is_default: false,
    sort_order: Number.MAX_SAFE_INTEGER,
    created_at: SYSTEM_TIMESTAMP,
    updated_at: SYSTEM_TIMESTAMP,
  };

  const events = [...buildStatutoryFestivalEvents(normalizedUserId, years), ...buildTraditionalFestivalEvents(normalizedUserId, years)]
    .sort((left, right) => {
      const startDiff = new Date(left.start_time).getTime() - new Date(right.start_time).getTime();
      if (startDiff !== 0) {
        return startDiff;
      }
      return left.title.localeCompare(right.title, 'zh-CN');
    });

  return { calendar, events };
}

export function ensureChinaHolidayCalendar(
  calendars: Calendar[],
  userId: string,
): Calendar[] {
  if (calendars.some((calendar) => calendar.id === CHINA_HOLIDAY_CALENDAR_ID)) {
    return calendars;
  }

  const { calendar } = buildChinaHolidayCalendar(userId);
  const maxSortOrder = calendars.length > 0
    ? Math.max(...calendars.map((item) => item.sort_order))
    : -1;

  return [
    ...calendars,
    {
      ...calendar,
      sort_order: maxSortOrder + 1,
    },
  ];
}
