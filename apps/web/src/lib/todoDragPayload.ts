const TODO_DRAG_MIME_TYPE = 'application/x-project-calendar-todo';
const TODO_DRAG_PREFIX = 'project-calendar-todo:';

export function writeTodoDragPayload(dataTransfer: DataTransfer, todoId: string): void {
  dataTransfer.setData(TODO_DRAG_MIME_TYPE, todoId);
  dataTransfer.setData('text/plain', `${TODO_DRAG_PREFIX}${todoId}`);
}

export function hasTodoDragPayload(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }

  const types = Array.from(dataTransfer.types ?? []);

  if (types.includes(TODO_DRAG_MIME_TYPE)) {
    return true;
  }

  if (!types.includes('text/plain')) {
    return false;
  }

  const fallback = dataTransfer.getData('text/plain');
  return fallback.startsWith(TODO_DRAG_PREFIX);
}

export function readTodoDragPayload(dataTransfer: DataTransfer | null): string | null {
  if (!dataTransfer) {
    return null;
  }

  const direct = dataTransfer.getData(TODO_DRAG_MIME_TYPE);
  if (direct) {
    return direct;
  }

  const fallback = dataTransfer.getData('text/plain');
  if (fallback.startsWith(TODO_DRAG_PREFIX)) {
    return fallback.slice(TODO_DRAG_PREFIX.length);
  }

  return null;
}
