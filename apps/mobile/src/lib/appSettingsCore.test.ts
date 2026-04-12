import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  weekStartDayToIndex,
} from './appSettingsCore';

describe('normalizeAppSettings', () => {
  it('falls back to defaults for invalid values', () => {
    expect(
      normalizeAppSettings({
        default_view: 'invalid' as never,
        week_start_day: 'invalid' as never,
        default_event_duration: 0,
        default_reminder_offsets: [],
        theme: 'invalid' as never,
      }),
    ).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('normalizes reminder offsets into a sorted unique list', () => {
    expect(
      normalizeAppSettings({
        default_reminder_offsets: [1440, 10, 10, -5, 30],
      }).default_reminder_offsets,
    ).toEqual([10, 30, 1440]);
  });
});

describe('weekStartDayToIndex', () => {
  it('maps monday to 1 and sunday to 0', () => {
    expect(weekStartDayToIndex('monday')).toBe(1);
    expect(weekStartDayToIndex('sunday')).toBe(0);
  });
});
