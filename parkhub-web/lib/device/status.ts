import type { DeviceStatus } from './types';

export const DEVICE_OFFLINE_TIMEOUT_MS = 5 * 60 * 1000;

function parseHeartbeatMs(heartbeat: string | null): number | null {
  if (!heartbeat) return null;
  const value = new Date(heartbeat).getTime();
  if (Number.isNaN(value)) return null;
  return value;
}

export function isDeviceHeartbeatOnline(
  heartbeat: string | null,
  nowMs: number = Date.now(),
  timeoutMs: number = DEVICE_OFFLINE_TIMEOUT_MS
): boolean {
  const heartbeatMs = parseHeartbeatMs(heartbeat);
  if (heartbeatMs === null) return false;
  return nowMs - heartbeatMs < timeoutMs;
}

export function getRuntimeDeviceStatus(
  status: DeviceStatus,
  heartbeat: string | null,
  nowMs: number = Date.now()
): DeviceStatus {
  if (status !== 'active') return status;
  if (isDeviceHeartbeatOnline(heartbeat, nowMs)) return 'active';
  return 'offline';
}
