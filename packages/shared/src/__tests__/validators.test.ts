import { describe, it, expect } from 'vitest';
import { validateEvent, validateTodo } from '../validators';

// ─────────────────────────────────────────────────────────────────────────────
// validateEvent
// ─────────────────────────────────────────────────────────────────────────────

describe('validateEvent', () => {
  // ── Happy path ──────────────────────────────────────────────────────────────

  it('returns valid with no errors when all required fields are present', () => {
    const result = validateEvent({
      title: 'Team meeting',
      calendar_id: 'cal-1',
      start_time: '2026-04-09T09:00:00',
      end_time: '2026-04-09T10:00:00',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns valid when only required fields are supplied (description/location omitted)', () => {
    const result = validateEvent({
      title: 'Standup',
      calendar_id: 'cal-2',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  // ── Title validation ─────────────────────────────────────────────────────

  it('returns an error on title when title is missing', () => {
    const result = validateEvent({
      calendar_id: 'cal-1',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
  });

  it('returns an error on title when title is an empty string', () => {
    const result = validateEvent({
      title: '',
      calendar_id: 'cal-1',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
  });

  it('returns an error on title when title is whitespace only', () => {
    const result = validateEvent({
      title: '   ',
      calendar_id: 'cal-1',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
  });

  // ── calendar_id validation ───────────────────────────────────────────────

  it('returns an error on calendar_id when calendar_id is missing', () => {
    const result = validateEvent({
      title: 'Team meeting',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('calendar_id');
  });

  it('returns an error on calendar_id when calendar_id is an empty string', () => {
    const result = validateEvent({
      title: 'Team meeting',
      calendar_id: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('calendar_id');
  });

  it('returns an error on calendar_id when calendar_id is whitespace only', () => {
    const result = validateEvent({
      title: 'Team meeting',
      calendar_id: '  ',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('calendar_id');
  });

  // ── Time validation ──────────────────────────────────────────────────────

  it('returns an error on end_time when end_time is before start_time', () => {
    const result = validateEvent({
      title: 'Meeting',
      calendar_id: 'cal-1',
      start_time: '2026-04-09T10:00:00',
      end_time: '2026-04-09T09:00:00',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('end_time');
  });

  it('returns an error on end_time when end_time equals start_time', () => {
    const result = validateEvent({
      title: 'Meeting',
      calendar_id: 'cal-1',
      start_time: '2026-04-09T10:00:00',
      end_time: '2026-04-09T10:00:00',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('end_time');
  });

  it('returns valid when end_time is strictly after start_time', () => {
    const result = validateEvent({
      title: 'Meeting',
      calendar_id: 'cal-1',
      start_time: '2026-04-09T09:00:00',
      end_time: '2026-04-09T09:01:00',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns an error on time when an invalid date string is supplied', () => {
    const result = validateEvent({
      title: 'Meeting',
      calendar_id: 'cal-1',
      start_time: 'not-a-date',
      end_time: '2026-04-09T10:00:00',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('time');
  });

  // ── All-day event ────────────────────────────────────────────────────────

  it('skips time comparison for all-day events even when end_time < start_time', () => {
    const result = validateEvent({
      title: 'Holiday',
      calendar_id: 'cal-1',
      is_all_day: true,
      start_time: '2026-04-09T00:00:00',
      end_time: '2026-04-08T00:00:00', // logically before start
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('skips time comparison for all-day events when end_time equals start_time', () => {
    const result = validateEvent({
      title: 'Holiday',
      calendar_id: 'cal-1',
      is_all_day: true,
      start_time: '2026-04-09T00:00:00',
      end_time: '2026-04-09T00:00:00',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  // ── Multiple errors ──────────────────────────────────────────────────────

  it('accumulates errors for both missing title and missing calendar_id', () => {
    const result = validateEvent({});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
    expect(result.errors).toHaveProperty('calendar_id');
  });

  it('accumulates errors for missing title, missing calendar_id, and bad time', () => {
    const result = validateEvent({
      start_time: '2026-04-09T10:00:00',
      end_time: '2026-04-09T09:00:00', // before start
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
    expect(result.errors).toHaveProperty('calendar_id');
    expect(result.errors).toHaveProperty('end_time');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateTodo
// ─────────────────────────────────────────────────────────────────────────────

describe('validateTodo', () => {
  // ── Happy path ──────────────────────────────────────────────────────────────

  it('returns valid with no errors when title and calendar_id are present', () => {
    const result = validateTodo({
      title: 'Buy groceries',
      calendar_id: 'cal-1',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns valid when due_date and due_time are both absent', () => {
    const result = validateTodo({
      title: 'Buy groceries',
      calendar_id: 'cal-1',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns valid when due_date is set but due_time is absent', () => {
    const result = validateTodo({
      title: 'Doctor appointment',
      calendar_id: 'cal-1',
      due_date: '2026-04-10',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns valid when both due_date and due_time are set', () => {
    const result = validateTodo({
      title: 'Doctor appointment',
      calendar_id: 'cal-1',
      due_date: '2026-04-10',
      due_time: '14:00',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  // ── Title validation ─────────────────────────────────────────────────────

  it('returns an error on title when title is missing', () => {
    const result = validateTodo({
      calendar_id: 'cal-1',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
  });

  it('returns an error on title when title is an empty string', () => {
    const result = validateTodo({
      title: '',
      calendar_id: 'cal-1',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
  });

  it('returns an error on title when title is whitespace only', () => {
    const result = validateTodo({
      title: '   ',
      calendar_id: 'cal-1',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
  });

  // ── calendar_id validation ───────────────────────────────────────────────

  it('returns an error on calendar_id when calendar_id is missing', () => {
    const result = validateTodo({
      title: 'Buy groceries',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('calendar_id');
  });

  it('returns an error on calendar_id when calendar_id is an empty string', () => {
    const result = validateTodo({
      title: 'Buy groceries',
      calendar_id: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('calendar_id');
  });

  it('returns an error on calendar_id when calendar_id is whitespace only', () => {
    const result = validateTodo({
      title: 'Buy groceries',
      calendar_id: '  ',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('calendar_id');
  });

  // ── due_date / due_time validation ───────────────────────────────────────

  it('returns an error on due_date when due_time is set but due_date is absent', () => {
    const result = validateTodo({
      title: 'Task',
      calendar_id: 'cal-1',
      due_time: '09:00',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('due_date');
  });

  it('returns an error on due_date when due_time is set but due_date is null', () => {
    const result = validateTodo({
      title: 'Task',
      calendar_id: 'cal-1',
      due_date: null,
      due_time: '09:00',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('due_date');
  });

  it('returns an error on due_date when due_time is set but due_date is empty string', () => {
    const result = validateTodo({
      title: 'Task',
      calendar_id: 'cal-1',
      due_date: '',
      due_time: '09:00',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('due_date');
  });

  it('does not require due_date when due_time is null', () => {
    const result = validateTodo({
      title: 'Task',
      calendar_id: 'cal-1',
      due_time: null,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  // ── Multiple errors ──────────────────────────────────────────────────────

  it('accumulates errors for both missing title and missing calendar_id', () => {
    const result = validateTodo({});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
    expect(result.errors).toHaveProperty('calendar_id');
  });

  it('accumulates errors for missing title, missing calendar_id, and due_time without due_date', () => {
    const result = validateTodo({
      due_time: '10:00',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
    expect(result.errors).toHaveProperty('calendar_id');
    expect(result.errors).toHaveProperty('due_date');
  });
});
