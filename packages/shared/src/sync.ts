// ============================================================
// Sync Utilities – incremental sync helpers (last-write-wins)
// ============================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncState {
  /** ISO 8601 timestamp of the last successful sync, or null if never synced */
  lastSyncedAt: string | null;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** The last sync error message, or null if the last sync succeeded */
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// buildSyncQuery
// ---------------------------------------------------------------------------

/**
 * Build a SQL WHERE clause fragment that selects records updated after
 * `lastSyncedAt`.  When `lastSyncedAt` is null the full table is returned.
 *
 * The returned string is intended to be appended to a Supabase `.filter()`
 * call or used in a raw query.  Example:
 *
 *   const filter = buildSyncQuery('events', state.lastSyncedAt);
 *   // filter === "updated_at=gt.2024-01-01T00:00:00.000Z"
 *
 * @param tableName    - Name of the table (included in the output for clarity)
 * @param lastSyncedAt - ISO timestamp of the last sync, or null for full fetch
 * @returns A Supabase PostgREST filter string
 */
export function buildSyncQuery(
  tableName: string,
  lastSyncedAt: string | null,
): string {
  if (!lastSyncedAt) {
    // No anchor point – fetch everything (no filter)
    return `${tableName}:updated_at=gt.1970-01-01T00:00:00.000Z`;
  }
  return `${tableName}:updated_at=gt.${lastSyncedAt}`;
}

// ---------------------------------------------------------------------------
// resolveConflict
// ---------------------------------------------------------------------------

/**
 * Given two versions of the same record, return the one with the later
 * `updated_at` timestamp (last-write-wins).
 *
 * @param local  - The locally stored copy of the record
 * @param server - The server copy of the record
 * @returns Whichever copy has the more recent `updated_at`
 */
export function resolveConflict<T extends { id: string; updated_at: string }>(
  local: T,
  server: T,
): T {
  return new Date(server.updated_at) > new Date(local.updated_at)
    ? server
    : local;
}

// ---------------------------------------------------------------------------
// mergeWithLastWriteWins
// ---------------------------------------------------------------------------

/**
 * Merge incoming server records with local records using a last-write-wins
 * strategy based on the `updated_at` field.
 *
 * Rules:
 * - For each server record: if it is newer than the local copy → replace local.
 * - If a record exists locally but not on the server → keep it (offline edit).
 * - If both sides have the same id: compare `updated_at`, keep the newer one.
 * - Records with a non-null `deleted_at` are kept so callers can act on them.
 *
 * @param localItems  - Items currently held in local state / cache
 * @param serverItems - Items received from the server during a sync
 * @returns Merged array sorted by `updated_at` descending
 */
export function mergeWithLastWriteWins<
  T extends { id: string; updated_at: string; deleted_at?: string | null },
>(localItems: T[], serverItems: T[]): T[] {
  // Index local items by id for O(1) lookup
  const localMap = new Map<string, T>();
  for (const item of localItems) {
    localMap.set(item.id, item);
  }

  // Process server items: upsert using last-write-wins
  for (const serverItem of serverItems) {
    const localItem = localMap.get(serverItem.id);
    if (!localItem) {
      // New record from server – add it
      localMap.set(serverItem.id, serverItem);
    } else {
      // Conflict – keep whichever is newer
      localMap.set(serverItem.id, resolveConflict(localItem, serverItem));
    }
  }

  // Convert back to array, sort by updated_at descending
  return Array.from(localMap.values()).sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}
