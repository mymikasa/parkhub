export type TenantStatus = 'active' | 'frozen';

export interface Tenant {
  id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantRequest {
  company_name: string;
  contact_name: string;
  contact_phone: string;
}

export interface UpdateTenantRequest {
  company_name?: string;
  contact_name?: string;
  contact_phone?: string;
}

export interface TenantListResponse {
  items: Tenant[];
  total: number;
  page: number;
  page_size: number;
}

export interface TenantFilter {
  status?: TenantStatus | 'all';
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TenantStats {
  total: number;
  active: number;
  frozen: number;
  parking_lots: number;
}
