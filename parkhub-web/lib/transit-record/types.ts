export type TransitType = "entry" | "exit";

export type TransitStatus =
  | "normal"
  | "paid"
  | "no_exit"
  | "no_entry"
  | "recognition_failed";

export type TransitStatusGroup = "all" | "normal" | "exception";

const EXCEPTION_STATUSES: TransitStatus[] = ["no_exit", "no_entry", "recognition_failed"];

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

export interface TransitRecordListResponse {
  items: TransitRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface TransitRecordFilter {
  page?: number;
  page_size?: number;
  parking_lot_id?: string;
  plate_number?: string;
  type?: TransitType;
  status?: TransitStatus;
  status_group?: Exclude<TransitStatusGroup, "all">;
  start_date?: string;
  end_date?: string;
}

export interface ResolveTransitRecordRequest {
  plate_number?: string;
  remark?: string;
}

export interface TransitExceptionSummary {
  no_exit: number;
  no_entry: number;
  recognition_failed: number;
  total: number;
}

export interface TransitStats {
  entry_count: number;
  exit_count: number;
  on_site_count: number;
  today_revenue: number;
}
