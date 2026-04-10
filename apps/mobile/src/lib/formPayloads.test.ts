import { describe, expect, it } from 'vitest';
import {
  buildEventInsertPayload,
  buildTodoInsertPayload,
} from './formPayloads';

describe('formPayloads', () => {
  it('buildEventInsertPayload uses the authenticated user id', () => {
    const payload = buildEventInsertPayload(
      {
        title: 'Standup',
        description: 'Daily sync',
        location: 'Room 101',
        start_time: '2026-04-10T09:00:00.000Z',
        end_time: '2026-04-10T10:00:00.000Z',
        is_all_day: false,
        calendar_id: 'cal-1',
        color: '#1a73e8',
      },
      'user-123',
    );

    expect(payload.user_id).toBe('user-123');
    expect(payload.calendar_id).toBe('cal-1');
    expect(payload.title).toBe('Standup');
  });

  it('buildTodoInsertPayload uses the authenticated user id', () => {
    const payload = buildTodoInsertPayload(
      {
        title: 'Write report',
        description: 'Quarterly summary',
        due_date: '2026-04-10',
        due_time: '18:00',
        calendar_id: 'cal-2',
        is_completed: false,
      },
      'user-456',
    );

    expect(payload.user_id).toBe('user-456');
    expect(payload.calendar_id).toBe('cal-2');
    expect(payload.title).toBe('Write report');
  });

  it('throws when the authenticated user id is missing', () => {
    expect(() =>
      buildEventInsertPayload(
        {
          title: 'Standup',
          description: '',
          location: '',
          start_time: '2026-04-10T09:00:00.000Z',
          end_time: '2026-04-10T10:00:00.000Z',
          is_all_day: false,
          calendar_id: 'cal-1',
          color: null,
        },
        '',
      ),
    ).toThrow('Authenticated user id is required');
  });
});
