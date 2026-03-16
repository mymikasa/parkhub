import type {
  Tenant,
  TenantListResponse,
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantFilter,
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

function buildQueryString(filter: TenantFilter): string {
  const params = new URLSearchParams();
  
  if (filter.status && filter.status !== 'all') {
    params.append('status', filter.status);
  }
  if (filter.search) {
    params.append('search', filter.search);
  }
  if (filter.page) {
    params.append('page', filter.page.toString());
  }
  if (filter.page_size) {
    params.append('page_size', filter.page_size.toString());
  }
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export async function getTenants(
  filter: TenantFilter = {},
  accessToken: string
): Promise<TenantListResponse> {
  const queryString = buildQueryString(filter);
  return request<TenantListResponse>(`/api/v1/tenants${queryString}`, {}, accessToken);
}

export async function getTenant(id: string, accessToken: string): Promise<Tenant> {
  return request<Tenant>(`/api/v1/tenants/${id}`, {}, accessToken);
}

export async function createTenant(
  req: CreateTenantRequest,
  accessToken: string
): Promise<Tenant> {
  return request<Tenant>('/api/v1/tenants', {
    method: 'POST',
    body: JSON.stringify(req),
  }, accessToken);
}

export async function updateTenant(
  id: string,
  req: UpdateTenantRequest,
  accessToken: string
): Promise<Tenant> {
  return request<Tenant>(`/api/v1/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  }, accessToken);
}

export async function freezeTenant(id: string, accessToken: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/tenants/${id}/freeze`, {
    method: 'POST',
  }, accessToken);
}

export async function unfreezeTenant(id: string, accessToken: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/tenants/${id}/unfreeze`, {
    method: 'POST',
  }, accessToken);
}
