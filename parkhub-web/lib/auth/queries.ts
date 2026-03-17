'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getValidAccessToken } from '@/lib/auth/store';
import * as authApi from './api';
import type { User, LoginRequest, SmsLoginRequest, SendSmsCodeRequest } from './types';

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
    onSuccess: () => {
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.clear();
    },
  });
}

export function useInvalidateCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: authKeys.user() });
}
