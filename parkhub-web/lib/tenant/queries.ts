'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type {
  Tenant,
  TenantFilter,
  TenantListResponse,
  CreateTenantRequest,
  UpdateTenantRequest,
} from './types';

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filter: TenantFilter) => [...tenantKeys.lists(), filter] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
};

export function useTenants(filter: TenantFilter = {}) {
  return useQuery({
    queryKey: tenantKeys.list(filter),
    queryFn: (): Promise<TenantListResponse> => api.getTenants(filter),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: (): Promise<Tenant> => api.getTenant(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: CreateTenantRequest): Promise<Tenant> => api.createTenant(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantRequest }): Promise<Tenant> =>
      api.updateTenant(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(tenantKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useFreezeTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string): Promise<void> => {
      return api.freezeTenant(id).then(() => {});
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useUnfreezeTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string): Promise<void> => {
      return api.unfreezeTenant(id).then(() => {});
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}
