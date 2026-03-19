'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getValidAccessToken } from '@/lib/auth/store';
import * as api from './api';
import type { UpdateBillingRuleRequest, CalculateFeeRequest } from './types';

export const billingRuleKeys = {
  all: ['billing-rules'] as const,
  byParkingLot: (parkingLotId: string) => [...billingRuleKeys.all, 'lot', parkingLotId] as const,
};

export function useBillingRule(parkingLotId: string) {
  return useQuery({
    queryKey: billingRuleKeys.byParkingLot(parkingLotId),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.getBillingRule(parkingLotId, accessToken);
    },
    enabled: !!parkingLotId,
  });
}

export function useUpdateBillingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBillingRuleRequest }) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.updateBillingRule(id, data, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingRuleKeys.all });
    },
  });
}

export function useCalculateFee() {
  return useMutation({
    mutationFn: async (data: CalculateFeeRequest) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('未登录');
      return api.calculateFee(data, accessToken);
    },
  });
}
