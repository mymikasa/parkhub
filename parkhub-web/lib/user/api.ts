import { request } from '@/lib/api';
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

export async function getUsers(filter: UserFilter = {}): Promise<UserListResponse> {
  const qs = buildQueryString({
    tenant_id: filter.tenant_id,
    role: filter.role,
    status: filter.status,
    keyword: filter.keyword,
    page: filter.page,
    page_size: filter.page_size,
  });
  return request<UserListResponse>(`/api/v1/users${qs}`);
}

export async function getUser(id: string): Promise<User> {
  return request<User>(`/api/v1/users/${id}`);
}

export async function createUser(req: CreateUserRequest): Promise<User> {
  return request<User>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function updateUser(id: string, req: UpdateUserRequest): Promise<User> {
  return request<User>(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

export async function freezeUser(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/users/${id}/freeze`, {
    method: 'POST',
  });
}

export async function unfreezeUser(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/users/${id}/unfreeze`, {
    method: 'POST',
  });
}

export async function resetPassword(id: string, req: ResetPasswordRequest): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function importUsers(req: ImportUsersRequest): Promise<ImportResult> {
  return request<ImportResult>('/api/v1/users/import', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// ─── Profile ────────────────────────────────────

export async function updateProfile(req: UpdateProfileRequest): Promise<User> {
  return request<User>('/api/v1/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

export async function changePassword(req: ChangePasswordRequest): Promise<{ message: string }> {
  return request<{ message: string }>('/api/v1/users/me/password', {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

export async function getMyLoginLogs(page = 1, pageSize = 20): Promise<LoginLogListResponse> {
  const qs = buildQueryString({ page, page_size: pageSize });
  return request<LoginLogListResponse>(`/api/v1/users/me/login-logs${qs}`);
}

// ─── Admin: Login Logs ──────────────────────────

export async function getUserLoginLogs(userId: string, page = 1, pageSize = 20): Promise<LoginLogListResponse> {
  const qs = buildQueryString({ page, page_size: pageSize });
  return request<LoginLogListResponse>(`/api/v1/users/${userId}/login-logs${qs}`);
}

// ─── Audit Logs ─────────────────────────────────

export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogListResponse> {
  const qs = buildQueryString({
    user_id: filter.user_id,
    action: filter.action,
    page: filter.page,
    page_size: filter.page_size,
  });
  return request<AuditLogListResponse>(`/api/v1/audit-logs${qs}`);
}
