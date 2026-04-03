'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { UpdateBillingRuleRequest, CalculateFeeRequest } from './types';

export const billingRuleKeys = {
  all: ['billing-rules'] as const,
  byParkingLot: (parkingLotId: string) => [...billingRuleKeys.all, 'lot', parkingLotId] as const,
};

export function useBillingRule(parkingLotId: string) {
  return useQuery({
    queryKey: billingRuleKeys.byParkingLot(parkingLotId),
    queryFn: () => api.getBillingRule(parkingLotId),
    enabled: !!parkingLotId,
  });
}

export function useUpdateBillingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBillingRuleRequest }) =>
      api.updateBillingRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingRuleKeys.all });
    },
  });
}

export function useCalculateFee() {
  return useMutation({
    mutationFn: (data: CalculateFeeRequest) => api.calculateFee(data),
  });
}
