import type {
  User,
  UserListResponse,
  UserFilter,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ImportUsersRequest,
  ImportResult,
  LoginLogListResponse,
  AuditLogListResponse,
  AuditLogFilter,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

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

function buildQueryString(filter: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '' && value !== 'all') {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ─── User Management ───────────────────────────

export async function getUsers(filter: UserFilter = {}, accessToken: string): Promise<UserListResponse> {
  const qs = buildQueryString({
    tenant_id: filter.tenant_id,
    role: filter.role,
    status: filter.status,
    keyword: filter.keyword,
    page: filter.page,
    page_size: filter.page_size,
  });
  return request<UserListResponse>(`/api/v1/users${qs}`, {}, accessToken);
}

export async function getUser(id: string, accessToken: string): Promise<User> {
  return request<User>(`/api/v1/users/${id}`, {}, accessToken);
}

export async function createUser(req: CreateUserRequest, accessToken: string): Promise<User> {
  return request<User>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(req),
  }, accessToken);
}

export async function updateUser(id: string, req: UpdateUserRequest, accessToken: string): Promise<User> {
  return request<User>(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  }, accessToken);
}

export async function freezeUser(id: string, accessToken: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/users/${id}/freeze`, {
    method: 'POST',
  }, accessToken);
}

export async function unfreezeUser(id: string, accessToken: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/users/${id}/unfreeze`, {
    method: 'POST',
  }, accessToken);
}

export async function resetPassword(id: string, req: ResetPasswordRequest, accessToken: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(req),
  }, accessToken);
}

export async function importUsers(req: ImportUsersRequest, accessToken: string): Promise<ImportResult> {
  return request<ImportResult>('/api/v1/users/import', {
    method: 'POST',
    body: JSON.stringify(req),
  }, accessToken);
}

// ─── Profile ────────────────────────────────────

export async function updateProfile(req: UpdateProfileRequest, accessToken: string): Promise<User> {
  return request<User>('/api/v1/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify(req),
  }, accessToken);
}

export async function changePassword(req: ChangePasswordRequest, accessToken: string): Promise<{ message: string }> {
  return request<{ message: string }>('/api/v1/users/me/password', {
    method: 'PUT',
    body: JSON.stringify(req),
  }, accessToken);
}

export async function getMyLoginLogs(page = 1, pageSize = 20, accessToken: string): Promise<LoginLogListResponse> {
  const qs = buildQueryString({ page, page_size: pageSize });
  return request<LoginLogListResponse>(`/api/v1/users/me/login-logs${qs}`, {}, accessToken);
}

// ─── Admin: Login Logs ──────────────────────────

export async function getUserLoginLogs(userId: string, page = 1, pageSize = 20, accessToken: string): Promise<LoginLogListResponse> {
  const qs = buildQueryString({ page, page_size: pageSize });
  return request<LoginLogListResponse>(`/api/v1/users/${userId}/login-logs${qs}`, {}, accessToken);
}

// ─── Audit Logs ─────────────────────────────────

export async function getAuditLogs(filter: AuditLogFilter = {}, accessToken: string): Promise<AuditLogListResponse> {
  const qs = buildQueryString({
    user_id: filter.user_id,
    action: filter.action,
    page: filter.page,
    page_size: filter.page_size,
  });
  return request<AuditLogListResponse>(`/api/v1/audit-logs${qs}`, {}, accessToken);
}
