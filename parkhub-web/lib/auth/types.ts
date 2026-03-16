export type UserRole = 'platform_admin' | 'tenant_admin' | 'operator';

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  real_name: string;
  role: UserRole;
  tenant_id: string | null;
  status: 'active' | 'frozen';
  created_at: string;
}

export interface LoginRequest {
  account: string;
  password: string;
  remember?: boolean;
}

export interface SmsLoginRequest {
  phone: string;
  code: string;
}

export interface SendSmsCodeRequest {
  phone: string;
  purpose: 'login';
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface TokenStorage {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (account: string, password: string, remember?: boolean) => Promise<void>;
  smsLogin: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

export type LoginFunction = (account: string, password: string, remember?: boolean) => Promise<void>;
export type LogoutFunction = () => Promise<void>;
