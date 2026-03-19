import type { TransitRecord, TransitStats } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    let msg = '请求失败';
    try {
      const body = await res.json();
      msg = body.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const payload = await res.json();

  if (
    payload &&
    typeof payload === 'object' &&
    'code' in payload &&
    'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export async function getTransitStats(accessToken: string): Promise<TransitStats> {
  return request<TransitStats>('/api/v1/transit-records/stats', accessToken);
}

export async function getLatestTransitRecords(
  accessToken: string,
  limit = 20,
): Promise<TransitRecord[]> {
  return request<TransitRecord[]>(
    `/api/v1/transit-records/latest?limit=${limit}`,
    accessToken,
  );
}

export async function getOverstayRecords(
  accessToken: string,
): Promise<TransitRecord[]> {
  return request<TransitRecord[]>(
    '/api/v1/transit-records/overstay',
    accessToken,
  );
}
