import type { Todo } from './types';

export type TodoFilterType = 'all' | 'today' | 'upcoming' | 'unscheduled';

export function filterTodosByDateBucket(
  todos: Todo[],
  filter: TodoFilterType,
  today: string,
): Todo[] {
  const visibleTodos = todos.filter((todo) => !todo.deleted_at);

  switch (filter) {
    case 'today':
      return visibleTodos.filter((todo) => todo.due_date === today);
    case 'upcoming':
      return visibleTodos.filter((todo) => todo.due_date !== null && todo.due_date > today);
    case 'unscheduled':
      return visibleTodos.filter((todo) => todo.due_date === null);
    case 'all':
    default:
      return visibleTodos;
  }
}

export function assignTodoDueDate(todo: Todo, nextDueDate: string): Todo | null {
  if (todo.due_date === nextDueDate) {
    return null;
  }

  return {
    ...todo,
    due_date: nextDueDate,
  };
}
