import { describe, expect, it } from 'vitest';
import type { Todo } from '../types';
import {
  assignTodoDueDate,
  filterTodosByDateBucket,
  type TodoFilterType,
} from '../todoScheduling';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: overrides.id ?? 'todo-1',
    user_id: overrides.user_id ?? 'user-1',
    calendar_id: overrides.calendar_id ?? 'cal-1',
    title: overrides.title ?? 'Test Todo',
    description: overrides.description ?? null,
    due_date: overrides.due_date ?? null,
    due_time: overrides.due_time ?? null,
    is_completed: overrides.is_completed ?? false,
    completed_at: overrides.completed_at ?? null,
    color: overrides.color ?? null,
    deleted_at: overrides.deleted_at ?? null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  };
}

function ids(list: Todo[]): string[] {
  return list.map((todo) => todo.id);
}

describe('filterTodosByDateBucket', () => {
  const todos = [
    makeTodo({ id: 'today', due_date: '2026-04-10' }),
    makeTodo({ id: 'upcoming', due_date: '2026-04-15' }),
    makeTodo({ id: 'unscheduled', due_date: null }),
    makeTodo({ id: 'deleted', due_date: null, deleted_at: '2026-04-01T00:00:00.000Z' }),
  ];

  function filter(filterType: TodoFilterType): string[] {
    return ids(filterTodosByDateBucket(todos, filterType, '2026-04-10'));
  }

  it('includes dated and undated todos in the all bucket', () => {
    expect(filter('all')).toEqual(['today', 'upcoming', 'unscheduled']);
  });

  it('returns only todos due today in the today bucket', () => {
    expect(filter('today')).toEqual(['today']);
  });

  it('returns only future-dated todos in the upcoming bucket', () => {
    expect(filter('upcoming')).toEqual(['upcoming']);
  });

  it('returns only todos without due dates in the unscheduled bucket', () => {
    expect(filter('unscheduled')).toEqual(['unscheduled']);
  });
});

describe('assignTodoDueDate', () => {
  it('returns a no-op when assigning the same due date', () => {
    const todo = makeTodo({ due_date: '2026-04-10', due_time: '17:00:00' });

    expect(assignTodoDueDate(todo, '2026-04-10')).toBeNull();
  });

  it('preserves due_time when assigning a new due date', () => {
    const todo = makeTodo({
      due_date: null,
      due_time: '17:00:00',
      description: 'keep me',
      is_completed: true,
      completed_at: '2026-04-09T12:00:00.000Z',
      calendar_id: 'cal-keep',
    });

    expect(assignTodoDueDate(todo, '2026-04-15')).toMatchObject({
      due_date: '2026-04-15',
      due_time: '17:00:00',
      description: 'keep me',
      is_completed: true,
      completed_at: '2026-04-09T12:00:00.000Z',
      calendar_id: 'cal-keep',
    });
  });
});
