'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getValidAccessToken } from '@/lib/auth/store';
import * as api from './api';
import type { DeviceFilter, CreateDeviceRequest, UpdateDeviceNameRequest, BindDeviceRequest } from './types';

export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (filter: DeviceFilter) => [...deviceKeys.lists(), filter] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
  stats: () => [...deviceKeys.all, 'stats'] as const,
};

export function useDevices(filter: DeviceFilter) {
  return useQuery({
    queryKey: deviceKeys.list(filter),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getDevices(filter, accessToken);
    },
  });
}

export function useDeviceStats() {
  return useQuery({
    queryKey: deviceKeys.stats(),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getDeviceStats(accessToken);
    },
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getDevice(id, accessToken);
    },
    enabled: !!id,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDeviceRequest) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.createDevice(data, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
  });
}

export function useUpdateDeviceName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDeviceNameRequest }) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.updateDeviceName(id, data, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
  });
}

export function useBindDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BindDeviceRequest }) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.bindDevice(id, data, accessToken);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
    },
  });
}

export function useUnbindDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.unbindDevice(id, accessToken);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
    },
  });
}
