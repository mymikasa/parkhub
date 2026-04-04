'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getValidAccessToken } from '@/lib/auth/store';
import * as authApi from './api';
import type { User, LoginRequest, SmsLoginRequest, SendSmsCodeRequest, TokenStorage } from './types';

const TOKEN_KEY = 'parkhub_auth';

function saveTokens(data: TokenStorage): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
  document.cookie = `access_token=${data.access_token}; path=/; max-age=${Math.floor((data.expires_at - Date.now()) / 1000)}; SameSite=Lax`;
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
}

export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: async (): Promise<User | null> => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return null;
      return authApi.getCurrentUser(accessToken);
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ account, password, remember }: LoginRequest & { remember?: boolean }) => {
      const res = await authApi.login({ account, password, remember });
      return res;
    },
    onSuccess: (data) => {
      const storage: TokenStorage = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
      };
      saveTokens(storage);
      queryClient.setQueryData(authKeys.user(), data.user);
    },
  });
}

export function useSmsLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phone, code }: SmsLoginRequest) => {
      const res = await authApi.smsLogin({ phone, code });
      return res;
    },
    onSuccess: (data) => {
      const storage: TokenStorage = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
      };
      saveTokens(storage);
      queryClient.setQueryData(authKeys.user(), data.user);
    },
  });
}

export function useSendSmsCode() {
  return useMutation({
    mutationFn: async (req: SendSmsCodeRequest) => {
      return authApi.sendSmsCode(req);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const storage = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('parkhub_auth') || '{}')
        : {};
      await authApi.logout(storage.access_token || '', storage.refresh_token);
    },
    onSettled: () => {
      clearTokens();
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.clear();
    },
  });
}

export function useInvalidateCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: authKeys.user() });
}
