import { request } from '@/lib/api';
import type {
  Tenant,
  TenantListResponse,
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantFilter,
} from './types';

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
): Promise<TenantListResponse> {
  const queryString = buildQueryString(filter);
  return request<TenantListResponse>(`/api/v1/tenants${queryString}`);
}

export async function getTenant(id: string): Promise<Tenant> {
  return request<Tenant>(`/api/v1/tenants/${id}`);
}

export async function createTenant(
  req: CreateTenantRequest,
): Promise<Tenant> {
  return request<Tenant>('/api/v1/tenants', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function updateTenant(
  id: string,
  req: UpdateTenantRequest,
): Promise<Tenant> {
  return request<Tenant>(`/api/v1/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

export async function freezeTenant(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/tenants/${id}/freeze`, {
    method: 'POST',
  });
}

export async function unfreezeTenant(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/v1/tenants/${id}/unfreeze`, {
    method: 'POST',
  });
}
