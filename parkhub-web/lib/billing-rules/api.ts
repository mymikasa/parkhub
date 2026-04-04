import { request, unwrapResponse, type ApiEnvelope } from '@/lib/api';
import type { BillingRule, UpdateBillingRuleRequest, CalculateFeeRequest, CalculateFeeResponse } from './types';

export async function getBillingRule(
  parkingLotId: string,
): Promise<BillingRule> {
  const resp = await request<ApiEnvelope<BillingRule>>(
    `/api/v1/billing-rules?parking_lot_id=${encodeURIComponent(parkingLotId)}`,
  );
  return unwrapResponse(resp);
}

export async function updateBillingRule(
  id: string,
  data: UpdateBillingRuleRequest,
): Promise<BillingRule> {
  const resp = await request<ApiEnvelope<BillingRule>>(
    `/api/v1/billing-rules/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(data) },
  );
  return unwrapResponse(resp);
}

export async function calculateFee(
  data: CalculateFeeRequest,
): Promise<CalculateFeeResponse> {
  const resp = await request<ApiEnvelope<CalculateFeeResponse>>(
    `/api/v1/billing-rules/calculate`,
    { method: 'POST', body: JSON.stringify(data) },
  );
  return unwrapResponse(resp);
}
