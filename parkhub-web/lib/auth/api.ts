import type {
  AuthResponse,
  AuthError,
  LoginRequest,
  SmsLoginRequest,
  SendSmsCodeRequest,
  User,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

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
    let errorBody: AuthError = { code: 'UNKNOWN_ERROR', message: '请求失败，请重试' };
    try {
      errorBody = await res.json();
    } catch {
      // ignore parse error
    }
    const err = new Error(errorBody.message) as Error & AuthError;
    err.code = errorBody.code;
    throw err;
  }

  return res.json();
}

export async function login(req: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function sendSmsCode(req: SendSmsCodeRequest): Promise<{ message: string }> {
  return request<{ message: string }>('/api/v1/auth/sms/send', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function smsLogin(req: SmsLoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/v1/auth/sms/login', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function refreshToken(refreshTkn: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshTkn }),
  });
}

export async function logout(accessToken: string, refreshTkn?: string): Promise<{ message: string }> {
  return request<{ message: string }>('/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshTkn }),
  }, accessToken);
}

export async function getCurrentUser(accessToken: string): Promise<User> {
  return request<User>('/api/v1/auth/me', {}, accessToken);
}
