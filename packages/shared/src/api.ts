// ============================================================
// CRUD API Wrappers
// ============================================================
//
// Each function accepts a TypedSupabaseClient so it can be used
// from both the web and mobile apps without coupling to a
// specific client instance.
//
// RLS on the database ensures that only the authenticated user's
// data is accessible, so we do NOT need to pass user_id in queries.
// For inserts we still set user_id because RLS INSERT policies
// validate it with `WITH CHECK (user_id = auth.uid())`.
// ============================================================

import type { TypedSupabaseClient } from './supabase';
import type { Database } from './database.types';

// Shorthand row / insert / update types
type Tables = Database['public']['Tables'];

type CalendarRow = Tables['calendars']['Row'];
type CalendarInsert = Tables['calendars']['Insert'];
type CalendarUpdate = Tables['calendars']['Update'];

type EventRow = Tables['events']['Row'];
type EventInsert = Tables['events']['Insert'];
type EventUpdate = Tables['events']['Update'];

type TodoRow = Tables['todos']['Row'];
type TodoInsert = Tables['todos']['Insert'];
type TodoUpdate = Tables['todos']['Update'];

type ReminderRow = Tables['reminders']['Row'];
type ReminderInsert = Tables['reminders']['Insert'];
type ReminderUpdate = Tables['reminders']['Update'];

type UserSettingsRow = Tables['user_settings']['Row'];
type UserSettingsUpdate = Tables['user_settings']['Update'];

type EventExceptionRow = Tables['event_exceptions']['Row'];
type EventExceptionInsert = Tables['event_exceptions']['Insert'];
type EventExceptionUpdate = Tables['event_exceptions']['Update'];

type RecurrenceRuleRow = Tables['recurrence_rules']['Row'];
type RecurrenceRuleInsert = Tables['recurrence_rules']['Insert'];
type RecurrenceRuleUpdate = Tables['recurrence_rules']['Update'];

// Re-export for convenience
export type {
  CalendarRow,
  CalendarInsert,
  CalendarUpdate,
  EventRow,
  EventInsert,
  EventUpdate,
  TodoRow,
  TodoInsert,
  TodoUpdate,
  ReminderRow,
  ReminderInsert,
  ReminderUpdate,
  UserSettingsRow,
  UserSettingsUpdate,
  EventExceptionRow,
  EventExceptionInsert,
  EventExceptionUpdate,
  RecurrenceRuleRow,
  RecurrenceRuleInsert,
  RecurrenceRuleUpdate,
};

/** Lightweight wrapper so callers get a consistent shape. */
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

function toResult<T>(data: T | null, error: { message: string } | null): ApiResult<T> {
  return { data, error: error?.message ?? null };
}

function toError<T>(message: string): ApiResult<T> {
  return { data: null, error: message };
}

// ============================================================
// Calendars
// ============================================================

export async function getCalendars(
  client: TypedSupabaseClient,
): Promise<ApiResult<CalendarRow[]>> {
  const { data, error } = await client
    .from('calendars')
    .select('*')
    .order('sort_order', { ascending: true });
  return toResult(data, error);
}

export async function getCalendar(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<CalendarRow>> {
  const { data, error } = await client
    .from('calendars')
    .select('*')
    .eq('id', id)
    .single();
  return toResult(data, error);
}

export async function createCalendar(
  client: TypedSupabaseClient,
  calendar: CalendarInsert,
): Promise<ApiResult<CalendarRow>> {
  const { data, error } = await client
    .from('calendars')
    .insert(calendar)
    .select()
    .single();
  return toResult(data, error);
}

export async function updateCalendar(
  client: TypedSupabaseClient,
  id: string,
  updates: CalendarUpdate,
): Promise<ApiResult<CalendarRow>> {
  const { data, error } = await client
    .from('calendars')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

export async function deleteCalendar(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<null>> {
  const { error } = await client
    .from('calendars')
    .delete()
    .eq('id', id);
  return toResult(null, error);
}

// ============================================================
// Events
// ============================================================

export async function getEvents(
  client: TypedSupabaseClient,
  options?: {
    calendarId?: string;
    startAfter?: string;
    endBefore?: string;
    includeDeleted?: boolean;
  },
): Promise<ApiResult<EventRow[]>> {
  let query = client.from('events').select('*');

  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null);
  }
  if (options?.calendarId) {
    query = query.eq('calendar_id', options.calendarId);
  }
  if (options?.startAfter) {
    query = query.gte('end_time', options.startAfter);
  }
  if (options?.endBefore) {
    query = query.lte('start_time', options.endBefore);
  }

  const { data, error } = await query.order('start_time', { ascending: true });
  return toResult(data, error);
}

export async function getEvent(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<EventRow>> {
  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  return toResult(data, error);
}

export async function createEvent(
  client: TypedSupabaseClient,
  event: EventInsert,
): Promise<ApiResult<EventRow>> {
  const { data, error } = await client
    .from('events')
    .insert(event)
    .select()
    .single();
  return toResult(data, error);
}

export async function updateEvent(
  client: TypedSupabaseClient,
  id: string,
  updates: EventUpdate,
): Promise<ApiResult<EventRow>> {
  const { data, error } = await client
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

/**
 * Soft-delete an event (sets deleted_at). Use `restoreEvent` to undo.
 */
export async function softDeleteEvent(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<EventRow>> {
  const { data, error } = await client
    .from('events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

/**
 * Restore a soft-deleted event.
 */
export async function restoreEvent(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<EventRow>> {
  const { data, error } = await client
    .from('events')
    .update({ deleted_at: null })
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

/**
 * Permanently delete an event.
 */
export async function deleteEvent(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<null>> {
  const { error } = await client
    .from('events')
    .delete()
    .eq('id', id);
  return toResult(null, error);
}

// ============================================================
// Event Exceptions
// ============================================================

export async function getEventExceptions(
  client: TypedSupabaseClient,
  eventId: string,
): Promise<ApiResult<EventExceptionRow[]>> {
  const { data, error } = await client
    .from('event_exceptions')
    .select('*')
    .eq('event_id', eventId)
    .order('original_date', { ascending: true });
  return toResult(data, error);
}

export async function createEventException(
  client: TypedSupabaseClient,
  exception: EventExceptionInsert,
): Promise<ApiResult<EventExceptionRow>> {
  const { data, error } = await client
    .from('event_exceptions')
    .insert(exception)
    .select()
    .single();
  return toResult(data, error);
}

export async function updateEventException(
  client: TypedSupabaseClient,
  id: string,
  updates: EventExceptionUpdate,
): Promise<ApiResult<EventExceptionRow>> {
  const { data, error } = await client
    .from('event_exceptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

export async function deleteEventException(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<null>> {
  const { error } = await client
    .from('event_exceptions')
    .delete()
    .eq('id', id);
  return toResult(null, error);
}

// ============================================================
// Recurrence Rules
// ============================================================

export async function getRecurrenceRule(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<RecurrenceRuleRow>> {
  const { data, error } = await client
    .from('recurrence_rules')
    .select('*')
    .eq('id', id)
    .single();
  return toResult(data, error);
}

export async function createRecurrenceRule(
  client: TypedSupabaseClient,
  rule: RecurrenceRuleInsert,
): Promise<ApiResult<RecurrenceRuleRow>> {
  const { data, error } = await client
    .from('recurrence_rules')
    .insert(rule)
    .select()
    .single();
  return toResult(data, error);
}

export async function updateRecurrenceRule(
  client: TypedSupabaseClient,
  id: string,
  updates: RecurrenceRuleUpdate,
): Promise<ApiResult<RecurrenceRuleRow>> {
  const { data, error } = await client
    .from('recurrence_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

export async function deleteRecurrenceRule(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<null>> {
  const { error } = await client
    .from('recurrence_rules')
    .delete()
    .eq('id', id);
  return toResult(null, error);
}

// ============================================================
// Todos
// ============================================================

export async function getTodos(
  client: TypedSupabaseClient,
  options?: {
    calendarId?: string;
    isCompleted?: boolean;
    includeDeleted?: boolean;
  },
): Promise<ApiResult<TodoRow[]>> {
  let query = client.from('todos').select('*');

  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null);
  }
  if (options?.calendarId) {
    query = query.eq('calendar_id', options.calendarId);
  }
  if (options?.isCompleted !== undefined) {
    query = query.eq('is_completed', options.isCompleted);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  return toResult(data, error);
}

export async function getTodo(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<TodoRow>> {
  const { data, error } = await client
    .from('todos')
    .select('*')
    .eq('id', id)
    .single();
  return toResult(data, error);
}

export async function createTodo(
  client: TypedSupabaseClient,
  todo: TodoInsert,
): Promise<ApiResult<TodoRow>> {
  const { data, error } = await client
    .from('todos')
    .insert(todo)
    .select()
    .single();
  return toResult(data, error);
}

export async function updateTodo(
  client: TypedSupabaseClient,
  id: string,
  updates: TodoUpdate,
): Promise<ApiResult<TodoRow>> {
  const { data, error } = await client
    .from('todos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

/**
 * Toggle the completed state of a todo.
 */
export async function toggleTodoCompleted(
  client: TypedSupabaseClient,
  id: string,
  isCompleted: boolean,
): Promise<ApiResult<TodoRow>> {
  const { data, error } = await client
    .from('todos')
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

/**
 * Soft-delete a todo (sets deleted_at). Use `restoreTodo` to undo.
 */
export async function softDeleteTodo(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<TodoRow>> {
  const { data, error } = await client
    .from('todos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

/**
 * Restore a soft-deleted todo.
 */
export async function restoreTodo(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<TodoRow>> {
  const { data, error } = await client
    .from('todos')
    .update({ deleted_at: null })
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

/**
 * Permanently delete a todo.
 */
export async function deleteTodo(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<null>> {
  const { error } = await client
    .from('todos')
    .delete()
    .eq('id', id);
  return toResult(null, error);
}

// ============================================================
// Reminders
// ============================================================

export async function getRemindersForEvent(
  client: TypedSupabaseClient,
  eventId: string,
): Promise<ApiResult<ReminderRow[]>> {
  const { data, error } = await client
    .from('reminders')
    .select('*')
    .eq('event_id', eventId)
    .order('offset_minutes', { ascending: true });
  return toResult(data, error);
}

export async function getRemindersForTodo(
  client: TypedSupabaseClient,
  todoId: string,
): Promise<ApiResult<ReminderRow[]>> {
  const { data, error } = await client
    .from('reminders')
    .select('*')
    .eq('todo_id', todoId)
    .order('offset_minutes', { ascending: true });
  return toResult(data, error);
}

export async function createReminder(
  client: TypedSupabaseClient,
  reminder: ReminderInsert,
): Promise<ApiResult<ReminderRow>> {
  const { data, error } = await client
    .from('reminders')
    .insert(reminder)
    .select()
    .single();
  return toResult(data, error);
}

export async function updateReminder(
  client: TypedSupabaseClient,
  id: string,
  updates: ReminderUpdate,
): Promise<ApiResult<ReminderRow>> {
  const { data, error } = await client
    .from('reminders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return toResult(data, error);
}

export async function deleteReminder(
  client: TypedSupabaseClient,
  id: string,
): Promise<ApiResult<null>> {
  const { error } = await client
    .from('reminders')
    .delete()
    .eq('id', id);
  return toResult(null, error);
}

/**
 * Replace all reminders for an event with a new set.
 * Useful when editing an event's reminder list in one go.
 */
export async function setRemindersForEvent(
  client: TypedSupabaseClient,
  eventId: string,
  offsetMinutes: number[],
): Promise<ApiResult<ReminderRow[]>> {
  // Delete existing reminders for this event
  const { error: deleteError } = await client
    .from('reminders')
    .delete()
    .eq('event_id', eventId);
  if (deleteError) return toError<ReminderRow[]>(deleteError.message);

  if (offsetMinutes.length === 0) {
    return toResult([] as ReminderRow[], null);
  }

  // Insert new reminders
  const inserts: ReminderInsert[] = offsetMinutes.map((offset) => ({
    event_id: eventId,
    offset_minutes: offset,
  }));
  const { data, error } = await client
    .from('reminders')
    .insert(inserts)
    .select();
  return toResult(data, error);
}

/**
 * Replace all reminders for a todo with a new set.
 */
export async function setRemindersForTodo(
  client: TypedSupabaseClient,
  todoId: string,
  offsetMinutes: number[],
): Promise<ApiResult<ReminderRow[]>> {
  const { error: deleteError } = await client
    .from('reminders')
    .delete()
    .eq('todo_id', todoId);
  if (deleteError) return toError<ReminderRow[]>(deleteError.message);

  if (offsetMinutes.length === 0) {
    return toResult([] as ReminderRow[], null);
  }

  const inserts: ReminderInsert[] = offsetMinutes.map((offset) => ({
    todo_id: todoId,
    offset_minutes: offset,
  }));
  const { data, error } = await client
    .from('reminders')
    .insert(inserts)
    .select();
  return toResult(data, error);
}

// ============================================================
// User Settings
// ============================================================

export async function getUserSettings(
  client: TypedSupabaseClient,
): Promise<ApiResult<UserSettingsRow>> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return toError<UserSettingsRow>('Not authenticated');

  const { data, error } = await client
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();
  return toResult(data, error);
}

export async function updateUserSettings(
  client: TypedSupabaseClient,
  updates: Omit<UserSettingsUpdate, 'id' | 'user_id'>,
): Promise<ApiResult<UserSettingsRow>> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return toError<UserSettingsRow>('Not authenticated');

  const { data, error } = await client
    .from('user_settings')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single();
  return toResult(data, error);
}

// ============================================================
// Profiles
// ============================================================

export async function getProfile(
  client: TypedSupabaseClient,
): Promise<ApiResult<Tables['profiles']['Row']>> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return toError<Tables['profiles']['Row']>('Not authenticated');

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return toResult(data, error);
}

export async function updateProfile(
  client: TypedSupabaseClient,
  updates: { display_name?: string | null },
): Promise<ApiResult<Tables['profiles']['Row']>> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return toError<Tables['profiles']['Row']>('Not authenticated');

  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  return toResult(data, error);
}
