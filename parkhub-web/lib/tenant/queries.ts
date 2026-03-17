'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getValidAccessToken } from '@/lib/auth/store';
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
    queryFn: async (): Promise<TenantListResponse> => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getTenants(filter, accessToken);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: async (): Promise<Tenant> => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getTenant(id, accessToken);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: CreateTenantRequest): Promise<Tenant> => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.createTenant(req, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTenantRequest }): Promise<Tenant> => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.updateTenant(id, data, accessToken);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(tenantKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useFreezeTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      await api.freezeTenant(id, accessToken);
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
    mutationFn: async (id: string): Promise<void> => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      await api.unfreezeTenant(id, accessToken);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}
