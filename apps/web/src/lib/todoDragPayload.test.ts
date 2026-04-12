import { describe, expect, it } from 'vitest';
import * as todoDragPayload from './todoDragPayload';

type FakeDataTransfer = {
  types?: string[];
  getData: (type: string) => string;
};

const TODO_DRAG_MIME_TYPE = 'application/x-project-calendar-todo';
const TODO_DRAG_PREFIX = 'project-calendar-todo:';

function makeDataTransfer({
  types = [],
  data = {},
}: {
  types?: string[];
  data?: Record<string, string>;
}): DataTransfer {
  const fake: FakeDataTransfer = {
    types,
    getData(type: string) {
      return data[type] ?? '';
    },
  };

  return fake as unknown as DataTransfer;
}

describe('todoDragPayload', () => {
  it('reads todo ids from the custom drag mime type on drop', () => {
    expect(
      todoDragPayload.readTodoDragPayload(
        makeDataTransfer({
          data: {
            [TODO_DRAG_MIME_TYPE]: 'todo-123',
          },
        }),
      ),
    ).toBe('todo-123');
  });

  it('detects todo drags from DataTransfer.types during dragover', () => {
    const api = todoDragPayload as Record<string, unknown>;

    expect(typeof api.hasTodoDragPayload).toBe('function');

    if (typeof api.hasTodoDragPayload !== 'function') {
      return;
    }

    expect(
      (
        api.hasTodoDragPayload as (dataTransfer: DataTransfer | null) => boolean
      )(
        makeDataTransfer({
          types: [TODO_DRAG_MIME_TYPE],
          data: {
            'text/plain': `${TODO_DRAG_PREFIX}todo-123`,
          },
        }),
      ),
    ).toBe(true);
  });
});
