import { describe, expect, it } from 'vitest';
import {
  DEVICE_OFFLINE_TIMEOUT_MS,
  getRuntimeDeviceStatus,
  isDeviceHeartbeatOnline,
} from './status';

describe('isDeviceHeartbeatOnline', () => {
  it('returns true when heartbeat is within timeout', () => {
    const now = Date.parse('2026-03-19T10:00:00Z');
    const heartbeat = new Date(now - (DEVICE_OFFLINE_TIMEOUT_MS - 1)).toISOString();

    expect(isDeviceHeartbeatOnline(heartbeat, now)).toBe(true);
  });

  it('returns false when heartbeat is expired', () => {
    const now = Date.parse('2026-03-19T10:00:00Z');
    const heartbeat = new Date(now - DEVICE_OFFLINE_TIMEOUT_MS).toISOString();

    expect(isDeviceHeartbeatOnline(heartbeat, now)).toBe(false);
  });

  it('returns false when heartbeat is missing or invalid', () => {
    const now = Date.parse('2026-03-19T10:00:00Z');

    expect(isDeviceHeartbeatOnline(null, now)).toBe(false);
    expect(isDeviceHeartbeatOnline('invalid-time', now)).toBe(false);
  });
});

describe('getRuntimeDeviceStatus', () => {
  it('keeps non-active status unchanged', () => {
    const now = Date.parse('2026-03-19T10:00:00Z');

    expect(getRuntimeDeviceStatus('offline', new Date(now).toISOString(), now)).toBe('offline');
    expect(getRuntimeDeviceStatus('pending', new Date(now).toISOString(), now)).toBe('pending');
    expect(getRuntimeDeviceStatus('disabled', new Date(now).toISOString(), now)).toBe('disabled');
  });

  it('maps active to offline when heartbeat is expired', () => {
    const now = Date.parse('2026-03-19T10:00:00Z');
    const heartbeat = new Date(now - DEVICE_OFFLINE_TIMEOUT_MS - 1000).toISOString();

    expect(getRuntimeDeviceStatus('active', heartbeat, now)).toBe('offline');
  });

  it('keeps active when heartbeat is fresh', () => {
    const now = Date.parse('2026-03-19T10:00:00Z');
    const heartbeat = new Date(now - 1000).toISOString();

    expect(getRuntimeDeviceStatus('active', heartbeat, now)).toBe('active');
  });
});
