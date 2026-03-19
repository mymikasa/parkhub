import type { BillingRule, UpdateBillingRuleRequest, CalculateFeeRequest, CalculateFeeResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

interface ApiError {
  code: string;
  message: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let errorBody: ApiError = { code: 'UNKNOWN_ERROR', message: '请求失败，请重试' };
    try {
      errorBody = await res.json();
    } catch {
      // ignore parse error
    }
    const err = new Error(errorBody.message) as Error & ApiError;
    err.code = errorBody.code;
    throw err;
  }

  return res.json();
}

function unwrapData<T>(payload: ApiEnvelope<T>): T {
  return payload.data;
}

export async function getBillingRule(
  parkingLotId: string,
  accessToken: string
): Promise<BillingRule> {
  const resp = await request<ApiEnvelope<BillingRule>>(
    `/api/v1/billing-rules?parking_lot_id=${encodeURIComponent(parkingLotId)}`,
    { method: 'GET' },
    accessToken
  );
  return unwrapData(resp);
}

export async function updateBillingRule(
  id: string,
  data: UpdateBillingRuleRequest,
  accessToken: string
): Promise<BillingRule> {
  const resp = await request<ApiEnvelope<BillingRule>>(
    `/api/v1/billing-rules/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(data) },
    accessToken
  );
  return unwrapData(resp);
}

export async function calculateFee(
  data: CalculateFeeRequest,
  accessToken: string
): Promise<CalculateFeeResponse> {
  const resp = await request<ApiEnvelope<CalculateFeeResponse>>(
    `/api/v1/billing-rules/calculate`,
    { method: 'POST', body: JSON.stringify(data) },
    accessToken
  );
  return unwrapData(resp);
}
