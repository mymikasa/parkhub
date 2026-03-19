import type {
  ResolveTransitRecordRequest,
  TransitExceptionSummary,
  TransitRecord,
  TransitRecordFilter,
  TransitRecordListResponse,
  TransitStats,
  TransitStatus,
  TransitType,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

interface ApiError {
  code: string;
  message: string;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

type TransitRecordRaw = Partial<TransitRecord> & {
  ID?: string;
  TenantID?: string;
  ParkingLotID?: string;
  ParkingLotName?: string;
  GateID?: string;
  GateName?: string;
  PlateNumber?: string | null;
  Type?: TransitType;
  Status?: TransitStatus;
  ImageURL?: string | null;
  Fee?: number | null;
  EntryRecordID?: string | null;
  ParkingDuration?: number | null;
  Remark?: string | null;
  ResolvedAt?: string | null;
  ResolvedBy?: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
};

type TransitRecordListRaw = {
  items?: TransitRecordRaw[];
  total?: number;
  page?: number;
  page_size?: number;
  Items?: TransitRecordRaw[];
  Total?: number;
  Page?: number;
  PageSize?: number;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let errorBody: ApiError = { code: "UNKNOWN_ERROR", message: "请求失败，请重试" };
    try {
      errorBody = await res.json();
    } catch {
      errorBody = { code: "UNKNOWN_ERROR", message: "请求失败，请重试" };
    }
    const err = new Error(errorBody.message) as Error & ApiError;
    err.code = errorBody.code;
    throw err;
  }

  return res.json();
}

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    "message" in payload &&
    "data" in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

function mapTransitRecord(raw: TransitRecordRaw): TransitRecord {
  return {
    id: raw.id ?? raw.ID ?? "",
    tenant_id: raw.tenant_id ?? raw.TenantID ?? "",
    parking_lot_id: raw.parking_lot_id ?? raw.ParkingLotID ?? "",
    parking_lot_name: raw.parking_lot_name ?? raw.ParkingLotName ?? "",
    gate_id: raw.gate_id ?? raw.GateID ?? "",
    gate_name: raw.gate_name ?? raw.GateName ?? "",
    plate_number: raw.plate_number ?? raw.PlateNumber ?? null,
    type: (raw.type ?? raw.Type ?? "entry") as TransitType,
    status: (raw.status ?? raw.Status ?? "normal") as TransitStatus,
    image_url: raw.image_url ?? raw.ImageURL ?? null,
    fee: raw.fee ?? raw.Fee ?? null,
    entry_record_id: raw.entry_record_id ?? raw.EntryRecordID ?? null,
    parking_duration: raw.parking_duration ?? raw.ParkingDuration ?? null,
    remark: raw.remark ?? raw.Remark ?? null,
    resolved_at: raw.resolved_at ?? raw.ResolvedAt ?? null,
    resolved_by: raw.resolved_by ?? raw.ResolvedBy ?? null,
    created_at: raw.created_at ?? raw.CreatedAt ?? "",
    updated_at: raw.updated_at ?? raw.UpdatedAt ?? "",
  };
}

function mapTransitRecordList(raw: TransitRecordListRaw): TransitRecordListResponse {
  return {
    items: (raw.items ?? raw.Items ?? []).map(mapTransitRecord),
    total: raw.total ?? raw.Total ?? 0,
    page: raw.page ?? raw.Page ?? 1,
    page_size: raw.page_size ?? raw.PageSize ?? 20,
  };
}

function buildQueryString(filter: TransitRecordFilter): string {
  const params = new URLSearchParams();

  if (filter.page) {
    params.append("page", String(filter.page));
  }
  if (filter.page_size) {
    params.append("page_size", String(filter.page_size));
  }
  if (filter.parking_lot_id) {
    params.append("parking_lot_id", filter.parking_lot_id);
  }
  if (filter.plate_number) {
    params.append("plate_number", filter.plate_number);
  }
  if (filter.type) {
    params.append("type", filter.type);
  }
  if (filter.status) {
    params.append("status", filter.status);
  }
  if (filter.status_group) {
    params.append("status_group", filter.status_group);
  }
  if (filter.start_date) {
    params.append("start_date", filter.start_date);
  }
  if (filter.end_date) {
    params.append("end_date", filter.end_date);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getTransitRecords(
  filter: TransitRecordFilter,
  accessToken: string
): Promise<TransitRecordListResponse> {
  const query = buildQueryString(filter);
  const response = await request<TransitRecordListRaw | ApiEnvelope<TransitRecordListRaw>>(
    `/api/v1/transit-records${query}`,
    {},
    accessToken
  );
  return mapTransitRecordList(unwrapResponse(response));
}

export async function getTransitRecord(
  id: string,
  accessToken: string
): Promise<TransitRecord> {
  const response = await request<TransitRecordRaw | ApiEnvelope<TransitRecordRaw>>(
    `/api/v1/transit-records/${id}`,
    {},
    accessToken
  );
  return mapTransitRecord(unwrapResponse(response));
}

export async function resolveTransitRecord(
  id: string,
  payload: ResolveTransitRecordRequest,
  accessToken: string
): Promise<TransitRecord> {
  const response = await request<TransitRecordRaw | ApiEnvelope<TransitRecordRaw>>(
    `/api/v1/transit-records/${id}/resolve`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken
  );
  return mapTransitRecord(unwrapResponse(response));
}

export async function getTransitExceptionSummary(
  filter: Omit<TransitRecordFilter, "page" | "page_size" | "status">,
  accessToken: string
): Promise<TransitExceptionSummary> {
  const baseFilter = {
    ...filter,
    page: 1,
    page_size: 1,
  };

  const [noExit, noEntry, recognitionFailed] = await Promise.all([
    getTransitRecords({ ...baseFilter, status: "no_exit" }, accessToken),
    getTransitRecords({ ...baseFilter, status: "no_entry" }, accessToken),
    getTransitRecords({ ...baseFilter, status: "recognition_failed" }, accessToken),
  ]);

  const summary = {
    no_exit: noExit.total,
    no_entry: noEntry.total,
    recognition_failed: recognitionFailed.total,
    total: noExit.total + noEntry.total + recognitionFailed.total,
  };

  return summary;
}

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }

  const starMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (starMatch?.[1]) {
    return decodeURIComponent(starMatch[1]);
  }

  const normalMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (normalMatch?.[1]) {
    return normalMatch[1];
  }

  return fallback;
}

export async function exportTransitRecords(
  filter: Omit<TransitRecordFilter, "page" | "page_size" | "status">,
  format: "csv" | "xlsx",
  accessToken: string
): Promise<{ blob: Blob; filename: string }> {
  const query = buildQueryString(filter as TransitRecordFilter);
  const connector = query ? "&" : "?";
  const url = `${API_BASE}/api/v1/transit-records/export${query}${connector}format=${format}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    let errorMessage = "导出失败，请重试";
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) {
        errorMessage = data.message;
      }
    } catch {
      errorMessage = "导出失败，请重试";
    }
    throw new Error(errorMessage);
  }

  const blob = await res.blob();
  const defaultFilename = `transit-records.${format === "xlsx" ? "xlsx" : "csv"}`;
  const filename = parseFilename(res.headers.get("content-disposition"), defaultFilename);

  return { blob, filename };
}

export async function getTransitStats(accessToken: string): Promise<TransitStats> {
  const response = await request<TransitStats | ApiEnvelope<TransitStats>>(
    "/api/v1/transit-records/stats",
    {},
    accessToken
  );
  return unwrapResponse(response);
}

export async function getLatestTransitRecords(
  accessToken: string,
  limit = 20,
): Promise<TransitRecord[]> {
  const response = await request<TransitRecord[] | ApiEnvelope<TransitRecord[]>>(
    `/api/v1/transit-records/latest?limit=${limit}`,
    {},
    accessToken
  );
  return unwrapResponse(response);
}

export async function getOverstayRecords(
  accessToken: string,
): Promise<TransitRecord[]> {
  const response = await request<TransitRecord[] | ApiEnvelope<TransitRecord[]>>(
    "/api/v1/transit-records/overstay",
    {},
    accessToken
  );
  return unwrapResponse(response);
}
