// ============================================================
// Network Utilities – pure helpers for connectivity detection
// ============================================================

/**
 * Detect a reconnect event: transitioning from offline/unknown to online.
 *
 * Returns `true` when:
 *   - Previous state was `null` (unknown) and next state is `true` (online)
 *   - Previous state was `false` (offline) and next state is `true` (online)
 *
 * Returns `false` for all other transitions (staying online, going offline,
 * staying offline, or staying unknown).
 *
 * @param prevState - The previous network state
 * @param nextState - The incoming network state
 */
export function detectReconnect(
  prevState: { isConnected: boolean | null },
  nextState: { isConnected: boolean | null },
): boolean {
  return nextState.isConnected === true && prevState.isConnected !== true;
}
