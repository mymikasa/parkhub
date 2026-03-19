'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getValidAccessToken } from '@/lib/auth/store';
import * as api from './api';
import type { ParkingLotFilter, CreateParkingLotRequest, UpdateParkingLotRequest, CreateGateRequest, UpdateGateRequest } from './types';

export const parkingLotKeys = {
  all: ['parking-lots'] as const,
  lists: () => [...parkingLotKeys.all, 'list'] as const,
  list: (filter: ParkingLotFilter) => [...parkingLotKeys.lists(), filter] as const,
  details: () => [...parkingLotKeys.all, 'detail'] as const,
  detail: (id: string) => [...parkingLotKeys.details(), id] as const,
  stats: () => [...parkingLotKeys.all, 'stats'] as const,
  gates: (parkingLotId: string) => [...parkingLotKeys.all, 'gates', parkingLotId] as const,
};

export function useParkingLots(filter: ParkingLotFilter, enabled = true, refetchInterval?: number) {
  return useQuery({
    queryKey: parkingLotKeys.list(filter),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getParkingLots(filter, accessToken);
    },
    enabled,
    refetchInterval,
  });
}

export function useParkingLot(id: string) {
  return useQuery({
    queryKey: parkingLotKeys.detail(id),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getParkingLot(id, accessToken);
    },
    enabled: !!id,
  });
}

export function useParkingLotStats() {
  return useQuery({
    queryKey: parkingLotKeys.stats(),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getParkingLotStats(accessToken);
    },
  });
}

export function useGates(parkingLotId: string) {
  return useQuery({
    queryKey: parkingLotKeys.gates(parkingLotId),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getGates(parkingLotId, accessToken);
    },
    enabled: !!parkingLotId,
  });
}

export function useCreateParkingLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateParkingLotRequest) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.createParkingLot(data, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.stats() });
    },
  });
}

export function useUpdateParkingLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateParkingLotRequest }) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.updateParkingLot(id, data, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.stats() });
    },
  });
}

export function useCreateGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parkingLotId, data }: { parkingLotId: string; data: CreateGateRequest }) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.createGate(parkingLotId, data, accessToken);
    },
    onSuccess: (_, { parkingLotId }) => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.gates(parkingLotId) });
    },
  });
}

export function useUpdateGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateGateRequest }) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.updateGate(id, data, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.all });
    },
  });
}

export function useDeleteGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.deleteGate(id, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.all });
    },
  });
}
