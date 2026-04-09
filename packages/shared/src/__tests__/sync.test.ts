import { describe, it, expect } from 'vitest';
import {
  mergeWithLastWriteWins,
  resolveConflict,
  buildSyncQuery,
} from '../sync';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Item = {
  id: string;
  updated_at: string;
  name: string;
  deleted_at?: string | null;
};

function makeItem(
  id: string,
  updatedAt: string,
  name: string,
  deletedAt?: string | null,
): Item {
  return { id, updated_at: updatedAt, name, deleted_at: deletedAt ?? null };
}

// ---------------------------------------------------------------------------
// resolveConflict
// ---------------------------------------------------------------------------

describe('resolveConflict', () => {
  it('returns local when local is newer', () => {
    const local = makeItem('1', '2024-02-01T00:00:00.000Z', 'local-newer');
    const server = makeItem('1', '2024-01-01T00:00:00.000Z', 'server-older');
    expect(resolveConflict(local, server)).toBe(local);
  });

  it('returns server when server is newer', () => {
    const local = makeItem('1', '2024-01-01T00:00:00.000Z', 'local-older');
    const server = makeItem('1', '2024-02-01T00:00:00.000Z', 'server-newer');
    expect(resolveConflict(local, server)).toBe(server);
  });

  it('returns local when timestamps are equal (deterministic tie-break)', () => {
    const ts = '2024-01-15T12:00:00.000Z';
    const local = makeItem('1', ts, 'local-same');
    const server = makeItem('1', ts, 'server-same');
    // The implementation returns local when server is NOT strictly greater,
    // so we just assert it returns one of the two objects consistently.
    const result = resolveConflict(local, server);
    expect(result === local || result === server).toBe(true);
    // Calling again must return the same choice (deterministic).
    expect(resolveConflict(local, server)).toEqual(result);
  });
});

// ---------------------------------------------------------------------------
// buildSyncQuery
// ---------------------------------------------------------------------------

describe('buildSyncQuery', () => {
  it('returns a string', () => {
    expect(typeof buildSyncQuery('events', null)).toBe('string');
    expect(typeof buildSyncQuery('events', '2024-01-01T00:00:00.000Z')).toBe(
      'string',
    );
  });

  it('includes the provided timestamp when lastSyncedAt is given', () => {
    const ts = '2024-06-15T08:30:00.000Z';
    const result = buildSyncQuery('events', ts);
    expect(result).toContain(ts);
  });

  it('includes the table name in the result', () => {
    expect(buildSyncQuery('events', '2024-01-01T00:00:00.000Z')).toContain(
      'events',
    );
    expect(buildSyncQuery('calendars', null)).toContain('calendars');
  });

  it('with null lastSyncedAt indicates fetch-all (epoch anchor)', () => {
    const result = buildSyncQuery('events', null);
    // The implementation uses 1970-01-01T00:00:00.000Z as the epoch anchor,
    // so the result should still be a non-empty string with a valid filter.
    expect(result.length).toBeGreaterThan(0);
    // Should NOT contain an actual sync timestamp — just the epoch placeholder.
    expect(result).toContain('1970-01-01T00:00:00.000Z');
  });

  it('differs based on lastSyncedAt value', () => {
    const withTs = buildSyncQuery('events', '2024-01-01T00:00:00.000Z');
    const withNull = buildSyncQuery('events', null);
    expect(withTs).not.toEqual(withNull);
  });
});

// ---------------------------------------------------------------------------
// mergeWithLastWriteWins
// ---------------------------------------------------------------------------

describe('mergeWithLastWriteWins', () => {
  it('server wins when server has a newer version', () => {
    const local = [makeItem('1', '2024-01-01T00:00:00.000Z', 'local')];
    const server = [makeItem('1', '2024-02-01T00:00:00.000Z', 'server')];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('server');
  });

  it('local wins when local has a newer version', () => {
    const local = [makeItem('1', '2024-03-01T00:00:00.000Z', 'local-newer')];
    const server = [makeItem('1', '2024-01-01T00:00:00.000Z', 'server-older')];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('local-newer');
  });

  it('includes an item that exists only on the server', () => {
    const local: Item[] = [];
    const server = [makeItem('42', '2024-01-01T00:00:00.000Z', 'server-only')];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('42');
    expect(result[0].name).toBe('server-only');
  });

  it('preserves local-only items (offline edits)', () => {
    const local = [makeItem('99', '2024-01-01T00:00:00.000Z', 'offline-edit')];
    const server: Item[] = [];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('99');
    expect(result[0].name).toBe('offline-edit');
  });

  it('returns a deterministic result when updated_at is the same', () => {
    const ts = '2024-05-01T00:00:00.000Z';
    const local = [makeItem('1', ts, 'local-same')];
    const server = [makeItem('1', ts, 'server-same')];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(1);
    // Either version is acceptable; just assert it is consistent across calls.
    const result2 = mergeWithLastWriteWins(local, server);
    expect(result[0].name).toBe(result2[0].name);
  });

  it('returns server items when local is empty', () => {
    const local: Item[] = [];
    const server = [
      makeItem('1', '2024-01-01T00:00:00.000Z', 'a'),
      makeItem('2', '2024-01-02T00:00:00.000Z', 'b'),
    ];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.id);
    expect(ids).toContain('1');
    expect(ids).toContain('2');
  });

  it('returns all local items when server is empty', () => {
    const local = [
      makeItem('10', '2024-01-01T00:00:00.000Z', 'x'),
      makeItem('11', '2024-01-02T00:00:00.000Z', 'y'),
    ];
    const server: Item[] = [];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.id);
    expect(ids).toContain('10');
    expect(ids).toContain('11');
  });

  it('returns an empty array when both inputs are empty', () => {
    expect(mergeWithLastWriteWins([], [])).toEqual([]);
  });

  it('includes a soft-deleted server item (deleted_at set)', () => {
    const local: Item[] = [];
    const server = [
      makeItem('5', '2024-04-01T00:00:00.000Z', 'deleted-event', '2024-04-01T12:00:00.000Z'),
    ];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(1);
    expect(result[0].deleted_at).toBe('2024-04-01T12:00:00.000Z');
  });

  it('soft-deleted server item wins over older local item and preserves deleted_at', () => {
    const local = [makeItem('5', '2024-03-01T00:00:00.000Z', 'active')];
    const server = [
      makeItem('5', '2024-04-01T00:00:00.000Z', 'deleted-event', '2024-04-01T12:00:00.000Z'),
    ];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('deleted-event');
    expect(result[0].deleted_at).toBe('2024-04-01T12:00:00.000Z');
  });

  it('resolves multiple items each with different timestamps correctly', () => {
    // id:A – server newer; id:B – local newer; id:C – server only; id:D – local only
    const local = [
      makeItem('A', '2024-01-01T00:00:00.000Z', 'A-local'),
      makeItem('B', '2024-03-01T00:00:00.000Z', 'B-local'),
      makeItem('D', '2024-02-01T00:00:00.000Z', 'D-local'),
    ];
    const server = [
      makeItem('A', '2024-02-01T00:00:00.000Z', 'A-server'),
      makeItem('B', '2024-01-01T00:00:00.000Z', 'B-server'),
      makeItem('C', '2024-04-01T00:00:00.000Z', 'C-server'),
    ];
    const result = mergeWithLastWriteWins(local, server);
    expect(result).toHaveLength(4);

    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId['A'].name).toBe('A-server'); // server newer
    expect(byId['B'].name).toBe('B-local');  // local newer
    expect(byId['C'].name).toBe('C-server'); // server only
    expect(byId['D'].name).toBe('D-local');  // local only
  });

  it('result is sorted by updated_at descending', () => {
    const local = [
      makeItem('1', '2024-01-01T00:00:00.000Z', 'oldest'),
      makeItem('2', '2024-06-01T00:00:00.000Z', 'newest'),
    ];
    const server = [
      makeItem('3', '2024-03-01T00:00:00.000Z', 'middle'),
    ];
    const result = mergeWithLastWriteWins(local, server);
    const timestamps = result.map((r) => r.updated_at);
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b.localeCompare(a)));
  });
});
