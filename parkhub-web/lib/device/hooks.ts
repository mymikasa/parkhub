'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { DeviceFilter, CreateDeviceRequest, UpdateDeviceNameRequest, BindDeviceRequest, ControlDeviceRequest } from './types';

export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (filter: DeviceFilter) => [...deviceKeys.lists(), filter] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
  stats: () => [...deviceKeys.all, 'stats'] as const,
  controlLogs: (id: string, page: number, pageSize: number) => [...deviceKeys.all, 'control-logs', id, page, pageSize] as const,
};

export function useDevices(filter: DeviceFilter) {
  return useQuery({
    queryKey: deviceKeys.list(filter),
    queryFn: () => api.getDevices(filter),
  });
}

export function useDeviceStats() {
  return useQuery({
    queryKey: deviceKeys.stats(),
    queryFn: () => api.getDeviceStats(),
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => api.getDevice(id),
    enabled: !!id,
  });
}

export function useDeviceControlLogs(id: string, page: number, pageSize: number = 20) {
  return useQuery({
    queryKey: deviceKeys.controlLogs(id, page, pageSize),
    queryFn: () => api.getDeviceControlLogs(id, page, pageSize),
    enabled: !!id,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeviceRequest) => api.createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
  });
}

export function useUpdateDeviceName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeviceNameRequest }) =>
      api.updateDeviceName(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
  });
}

export function useBindDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BindDeviceRequest }) =>
      api.bindDevice(id, data),
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
    mutationFn: (id: string) => api.unbindDevice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
    },
  });
}

export function useDisableDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.disableDevice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
    },
  });
}

export function useEnableDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.enableDevice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
  });
}

export function useBatchDisableDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.batchDisableDevices({ ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
  });
}

export function useBatchEnableDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.batchEnableDevices({ ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
  });
}

export function useBatchDeleteDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.batchDeleteDevices({ ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
  });
}

export function useBatchBindDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      ids: string[];
      tenant_id: string;
      parking_lot_id: string;
      gate_id: string;
    }) => api.batchBindDevices(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
  });
}

export function useControlDevice() {
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: ControlDeviceRequest['command'] }) =>
      api.controlDevice(id, { command }),
  });
}
