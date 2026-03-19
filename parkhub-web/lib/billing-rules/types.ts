export interface BillingRule {
  id: string;
  tenant_id: string;
  parking_lot_id: string;
  free_minutes: number;
  price_per_hour: number;
  daily_cap: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateBillingRuleRequest {
  free_minutes: number;
  price_per_hour: number;
  daily_cap: number;
}

export interface CalculateFeeRequest {
  parking_lot_id: string;
  entry_time: string;
  exit_time: string;
}

export interface CalculateFeeResponse {
  parking_duration: number;
  free_minutes: number;
  billable_minutes: number;
  billable_hours: number;
  price_per_hour: number;
  daily_cap: number;
  days: number;
  raw_fee: number;
  final_fee: number;
}
