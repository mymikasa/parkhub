'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    queryFn: () => api.getParkingLots(filter),
    enabled,
    refetchInterval,
  });
}

export function useParkingLot(id: string) {
  return useQuery({
    queryKey: parkingLotKeys.detail(id),
    queryFn: () => api.getParkingLot(id),
    enabled: !!id,
  });
}

export function useParkingLotStats() {
  return useQuery({
    queryKey: parkingLotKeys.stats(),
    queryFn: () => api.getParkingLotStats(),
  });
}

export function useGates(parkingLotId: string) {
  return useQuery({
    queryKey: parkingLotKeys.gates(parkingLotId),
    queryFn: () => api.getGates(parkingLotId),
    enabled: !!parkingLotId,
  });
}

export function useCreateParkingLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateParkingLotRequest) => api.createParkingLot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.stats() });
    },
  });
}

export function useUpdateParkingLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateParkingLotRequest }) =>
      api.updateParkingLot(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.stats() });
    },
  });
}

export function useCreateGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ parkingLotId, data }: { parkingLotId: string; data: CreateGateRequest }) =>
      api.createGate(parkingLotId, data),
    onSuccess: (_, { parkingLotId }) => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.gates(parkingLotId) });
    },
  });
}

export function useUpdateGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGateRequest }) =>
      api.updateGate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.all });
    },
  });
}

export function useDeleteGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteGate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parkingLotKeys.all });
    },
  });
}
