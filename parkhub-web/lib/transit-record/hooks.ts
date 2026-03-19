'use client';

import { useQuery } from '@tanstack/react-query';
import { getValidAccessToken } from '@/lib/auth/store';
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
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getTransitStats(accessToken);
    },
    refetchInterval,
  });
}

export function useLatestTransitRecords(refetchInterval = 10000) {
  return useQuery({
    queryKey: transitRecordKeys.latest(),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getLatestTransitRecords(accessToken, 20);
    },
    refetchInterval,
  });
}

export function useOverstayRecords(refetchInterval = 60000) {
  return useQuery({
    queryKey: transitRecordKeys.overstay(),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getOverstayRecords(accessToken);
    },
    refetchInterval,
  });
}
