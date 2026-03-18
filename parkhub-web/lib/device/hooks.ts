'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getValidAccessToken } from '@/lib/auth/store';
import * as api from './api';
import type { DeviceFilter, UpdateDeviceNameRequest } from './types';

export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (filter: DeviceFilter) => [...deviceKeys.lists(), filter] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
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
    },
  });
}
