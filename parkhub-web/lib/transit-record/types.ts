export type TransitType = 'entry' | 'exit';

export type TransitStatus = 'normal' | 'paid' | 'no_exit' | 'no_entry' | 'recognition_failed';

const EXCEPTION_STATUSES: TransitStatus[] = ['no_exit', 'no_entry', 'recognition_failed'];

export function isExceptionStatus(status: TransitStatus): boolean {
  return EXCEPTION_STATUSES.includes(status);
}

export interface TransitRecord {
  id: string;
  tenant_id: string;
  parking_lot_id: string;
  parking_lot_name: string;
  gate_id: string;
  gate_name: string;
  plate_number: string | null;
  type: TransitType;
  status: TransitStatus;
  image_url: string | null;
  fee: number | null;
  entry_record_id: string | null;
  parking_duration: number | null;
  remark: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransitStats {
  entry_count: number;
  exit_count: number;
  on_site_count: number;
  today_revenue: number;
}
