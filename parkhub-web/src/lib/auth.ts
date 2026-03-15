import api from './api'

// Types
export interface LoginRequest {
  account: string
  password: string
  remember?: boolean
}

export interface SmsLoginRequest {
  phone: string
  code: string
}

export interface SendSmsCodeRequest {
  phone: string
  purpose: 'login' | 'reset_password'
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: UserInfo
}

export interface UserInfo {
  id: string
  username: string
  email?: string
  phone?: string
  real_name: string
  role: string
  tenant_id?: string
}

export interface CurrentUserResponse {
  id: string
  username: string
  email?: string
  phone?: string
  real_name: string
  role: string
  tenant_id?: string
  status: string
  created_at: string
}

// API Functions

/**
 * 账号密码登录
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', data)
  return response.data
}

/**
 * 发送短信验证码
 */
export async function sendSmsCode(data: SendSmsCodeRequest): Promise<void> {
  await api.post('/auth/sms/send', data)
}

/**
 * 短信验证码登录
 */
export async function smsLogin(data: SmsLoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/sms/login', data)
  return response.data
}

/**
 * 刷新 Token
 */
export async function refreshToken(refreshToken: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  return response.data
}

/**
 * 登出
 */
export async function logout(refreshToken?: string): Promise<void> {
  await api.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {})
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await api.get<CurrentUserResponse>('/auth/me')
  return response.data
}
