import { describe, it, expect } from 'vitest';
import { detectReconnect } from '../networkUtils';

describe('detectReconnect', () => {
  it('returns true when transitioning from null to true (first connection)', () => {
    expect(detectReconnect({ isConnected: null }, { isConnected: true })).toBe(true);
  });

  it('returns true when transitioning from false to true (reconnected)', () => {
    expect(detectReconnect({ isConnected: false }, { isConnected: true })).toBe(true);
  });

  it('returns false when staying online (true → true)', () => {
    expect(detectReconnect({ isConnected: true }, { isConnected: true })).toBe(false);
  });

  it('returns false when going offline (true → false)', () => {
    expect(detectReconnect({ isConnected: true }, { isConnected: false })).toBe(false);
  });

  it('returns false when staying offline (false → false)', () => {
    expect(detectReconnect({ isConnected: false }, { isConnected: false })).toBe(false);
  });

  it('returns false when transitioning from null to false', () => {
    expect(detectReconnect({ isConnected: null }, { isConnected: false })).toBe(false);
  });

  it('returns false when staying unknown (null → null)', () => {
    expect(detectReconnect({ isConnected: null }, { isConnected: null })).toBe(false);
  });
});
