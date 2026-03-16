'use client';

import { useState, useEffect, useCallback } from 'react';
import { getValidAccessToken } from '@/lib/auth/store';
import * as api from './api';
import type {
  Tenant,
  TenantFilter,
  TenantListResponse,
  CreateTenantRequest,
  UpdateTenantRequest,
} from './types';

export function useTenants(filter: TenantFilter = {}) {
  const [data, setData] = useState<TenantListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  // Stable string key — only changes when filter values actually change
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    let cancelled = false;

    async function fetchTenants() {
      const accessToken = await getValidAccessToken();
      if (!accessToken || cancelled) return;

      setIsLoading(true);
      setError(null);

      try {
        const parsed: TenantFilter = JSON.parse(filterKey);
        const result = await api.getTenants(parsed, accessToken);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error('获取租户列表失败'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchTenants();

    return () => { cancelled = true; };
  }, [filterKey, refetchCount]);

  const refetch = useCallback(() => {
    setRefetchCount(c => c + 1);
  }, []);

  return { data, isLoading, error, refetch };
}

export function useTenant(id: string) {
  const [data, setData] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    async function fetchTenant() {
      const accessToken = await getValidAccessToken();
      if (!accessToken || !id) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await api.getTenant(id, accessToken);
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('获取租户详情失败'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTenant();

    return () => {
      mounted = false;
    };
  }, [id]);

  return { data, isLoading, error };
}

export function useCreateTenant() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (req: CreateTenantRequest, onSuccess?: (data: Tenant) => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await api.createTenant(req, accessToken);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('创建租户失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useUpdateTenant() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (
    id: string,
    req: UpdateTenantRequest,
    onSuccess?: (data: Tenant) => void
  ) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await api.updateTenant(id, req, accessToken);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新租户失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useFreezeTenant() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: string, onSuccess?: () => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      await api.freezeTenant(id, accessToken);
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('冻结租户失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useUnfreezeTenant() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: string, onSuccess?: () => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      await api.unfreezeTenant(id, accessToken);
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('解冻租户失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}
