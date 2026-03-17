export type UserStatus = 'active' | 'frozen';
export type UserRole = 'platform_admin' | 'tenant_admin' | 'operator';

export interface User {
  id: string;
  tenant_id?: string;
  username: string;
  email?: string;
  phone?: string;
  real_name: string;
  role: UserRole;
  status: UserStatus;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  active_count: number;
  frozen_count: number;
  admin_count: number;
  operator_count: number;
}

export interface UserFilter {
  tenant_id?: string;
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface CreateUserRequest {
  username: string;
  real_name: string;
  role: string;
  tenant_id: string;
  password: string;
  email?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  real_name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface ResetPasswordRequest {
  new_password: string;
}

export interface UpdateProfileRequest {
  real_name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface ImportUsersRequest {
  users: CreateUserRequest[];
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors?: ImportError[];
}

export interface ImportError {
  row: number;
  message: string;
}

export interface LoginLog {
  id: string;
  user_id: string;
  ip: string;
  user_agent: string;
  status: 'success' | 'failed';
  reason?: string;
  created_at: string;
}

export interface LoginLogListResponse {
  items: LoginLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  tenant_id?: string;
  action: string;
  target_type: string;
  target_id: string;
  detail?: string;
  ip?: string;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditLogFilter {
  user_id?: string;
  action?: string;
  page?: number;
  page_size?: number;
}
