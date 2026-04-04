'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from './api';

export const transitRecordKeys = {
  all: ['transit-records'] as const,
  stats: () => [...transitRecordKeys.all, 'stats'] as const,
  latest: () => [...transitRecordKeys.all, 'latest'] as const,
  overstay: () => [...transitRecordKeys.all, 'overstay'] as const,
};

export function useTransitStats(refetchInterval = 60000) {
  return useQuery({
    queryKey: transitRecordKeys.stats(),
    queryFn: () => api.getTransitStats(),
    refetchInterval,
  });
}

export function useLatestTransitRecords(refetchInterval = 10000) {
  return useQuery({
    queryKey: transitRecordKeys.latest(),
    queryFn: () => api.getLatestTransitRecords(20),
    refetchInterval,
  });
}

export function useOverstayRecords(refetchInterval = 60000) {
  return useQuery({
    queryKey: transitRecordKeys.overstay(),
    queryFn: () => api.getOverstayRecords(),
    refetchInterval,
  });
}
