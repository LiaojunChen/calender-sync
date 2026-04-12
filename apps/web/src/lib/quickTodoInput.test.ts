import { describe, expect, it } from 'vitest';
import type { Calendar } from '@project-calendar/shared';
import { prepareQuickTodoCreate } from './quickTodoInput';

function makeCalendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    id: overrides.id ?? 'cal-1',
    user_id: overrides.user_id ?? 'user-1',
    name: overrides.name ?? 'Calendar',
    color: overrides.color ?? '#1a73e8',
    is_visible: overrides.is_visible ?? true,
    is_default: overrides.is_default ?? false,
    sort_order: overrides.sort_order ?? 0,
    created_at: overrides.created_at ?? '2026-04-11T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-04-11T00:00:00.000Z',
  };
}

describe('prepareQuickTodoCreate', () => {
  it('trims title and uses the default calendar when available', () => {
    expect(
      prepareQuickTodoCreate('  买牛奶  ', [
        makeCalendar({ id: 'cal-a' }),
        makeCalendar({ id: 'cal-default', is_default: true }),
      ]),
    ).toEqual({
      title: '买牛奶',
      calendarId: 'cal-default',
    });
  });

  it('falls back to the first writable calendar when no default exists', () => {
    expect(
      prepareQuickTodoCreate('整理周报', [
        makeCalendar({ id: 'cal-first' }),
        makeCalendar({ id: 'cal-second' }),
      ]),
    ).toEqual({
      title: '整理周报',
      calendarId: 'cal-first',
    });
  });

  it('returns null for empty titles or when no writable calendars exist', () => {
    expect(prepareQuickTodoCreate('   ', [makeCalendar()])).toBeNull();
    expect(prepareQuickTodoCreate('整理周报', [])).toBeNull();
  });
});
