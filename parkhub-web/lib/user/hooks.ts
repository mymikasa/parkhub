'use client';

import { useState, useEffect, useCallback } from 'react';
import { getValidAccessToken } from '@/lib/auth/store';
import * as api from './api';
import type {
  User,
  UserFilter,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ImportUsersRequest,
  ImportResult,
  LoginLogListResponse,
} from './types';

// ─── Query Hooks ────────────────────────────────

export function useUsers(filter: UserFilter = {}) {
  const [data, setData] = useState<UserListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      const accessToken = await getValidAccessToken();
      if (!accessToken || cancelled) return;

      setIsLoading(true);
      setError(null);

      try {
        const parsed: UserFilter = JSON.parse(filterKey);
        const result = await api.getUsers(parsed, accessToken);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error('获取用户列表失败'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchUsers();
    return () => { cancelled = true; };
  }, [filterKey, refetchCount]);

  const refetch = useCallback(() => {
    setRefetchCount(c => c + 1);
  }, []);

  return { data, isLoading, error, refetch };
}

export function useMyLoginLogs(page = 1, pageSize = 20) {
  const [data, setData] = useState<LoginLogListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      const accessToken = await getValidAccessToken();
      if (!accessToken || cancelled) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await api.getMyLoginLogs(page, pageSize, accessToken);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error('获取登录日志失败'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchLogs();
    return () => { cancelled = true; };
  }, [page, pageSize]);

  return { data, isLoading, error };
}

// ─── Mutation Hooks ─────────────────────────────

export function useCreateUser() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (req: CreateUserRequest, onSuccess?: (data: User) => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await api.createUser(req, accessToken);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('创建用户失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useUpdateUser() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: string, req: UpdateUserRequest, onSuccess?: (data: User) => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await api.updateUser(id, req, accessToken);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新用户失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useFreezeUser() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: string, onSuccess?: () => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      await api.freezeUser(id, accessToken);
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('冻结用户失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useUnfreezeUser() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: string, onSuccess?: () => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      await api.unfreezeUser(id, accessToken);
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('解冻用户失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useResetPassword() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: string, req: ResetPasswordRequest, onSuccess?: () => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      await api.resetPassword(id, req, accessToken);
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('重置密码失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useUpdateProfile() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (req: UpdateProfileRequest, onSuccess?: (data: User) => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await api.updateProfile(req, accessToken);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('更新资料失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useChangePassword() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (req: ChangePasswordRequest, onSuccess?: () => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      await api.changePassword(req, accessToken);
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('修改密码失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

export function useImportUsers() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (req: ImportUsersRequest, onSuccess?: (data: ImportResult) => void) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await api.importUsers(req, accessToken);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('导入用户失败');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}
