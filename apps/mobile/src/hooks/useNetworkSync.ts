// ============================================================
// useNetworkSync
// ============================================================
//
// Subscribes to network connectivity changes via NetInfo.
// When the device transitions from offline → online, the
// supplied `onReconnect` callback is invoked so that callers
// can trigger a data re-fetch / sync.
//
// Usage:
//   const { isConnected } = useNetworkSync(() => fetchData());
// ============================================================

import { useEffect, useRef, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export interface NetworkSyncResult {
  /** Whether the device currently has network connectivity */
  isConnected: boolean;
}

/**
 * Subscribe to network state changes.
 *
 * @param onReconnect - Called each time the network transitions from
 *   disconnected/unknown to connected.  Keep the reference stable
 *   (e.g. wrap in useCallback) to avoid unnecessary re-subscriptions.
 */
export function useNetworkSync(
  onReconnect: () => void,
): NetworkSyncResult {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Store the latest callback without re-subscribing when it changes
  const onReconnectRef = useRef(onReconnect);
  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  // Track the *previous* connectivity state so we can detect offline → online
  const prevConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected === true;

      setIsConnected(connected);

      // Trigger sync on reconnect (offline → online transition)
      if (connected && prevConnectedRef.current === false) {
        onReconnectRef.current();
      }

      prevConnectedRef.current = connected;
    });

    // Fetch initial state
    void NetInfo.fetch().then((state: NetInfoState) => {
      const connected = state.isConnected === true;
      setIsConnected(connected);
      prevConnectedRef.current = connected;
    });

    return () => {
      unsubscribe();
    };
  }, []); // subscribe once; callback updates via ref

  return { isConnected };
}
