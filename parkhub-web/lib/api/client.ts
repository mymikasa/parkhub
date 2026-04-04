import { getValidAccessToken } from '@/lib/auth/store';
import { ApiError, type ApiEnvelope } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      throw new ApiError('UNAUTHORIZED', '未登录');
    }
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = '请求失败，请重试';
    try {
      const body = await res.json();
      if (body.code) code = body.code;
      if (body.message) message = body.message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(code, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  try {
    return await res.json() as T;
  } catch {
    return undefined as T;
  }
}

export function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'code' in payload &&
    'message' in payload &&
    'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}
