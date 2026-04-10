import type { EventInsert, TodoInsert } from '@project-calendar/shared';

interface EventInsertInput {
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  calendar_id: string;
  color?: string | null;
}

interface TodoInsertInput {
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  calendar_id: string;
  is_completed?: boolean;
}

function requireAuthenticatedUserId(userId: string): string {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error('Authenticated user id is required');
  }
  return normalized;
}

export function buildEventInsertPayload(
  input: EventInsertInput,
  userId: string,
): EventInsert {
  return {
    user_id: requireAuthenticatedUserId(userId),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    location: input.location?.trim() || undefined,
    start_time: input.start_time,
    end_time: input.end_time,
    is_all_day: input.is_all_day,
    calendar_id: input.calendar_id,
    color: input.color ?? undefined,
  };
}

export function buildTodoInsertPayload(
  input: TodoInsertInput,
  userId: string,
): TodoInsert {
  return {
    user_id: requireAuthenticatedUserId(userId),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    due_date: input.due_date?.trim() || undefined,
    due_time: input.due_time?.trim() || undefined,
    calendar_id: input.calendar_id,
    is_completed: input.is_completed ?? false,
  };
}
