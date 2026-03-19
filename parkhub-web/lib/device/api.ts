import type {
  Device,
  DeviceDetail,
  DeviceListResponse,
  DeviceFilter,
  DeviceStats,
  CreateDeviceRequest,
  UpdateDeviceNameRequest,
  BindDeviceRequest,
  BatchDeviceActionRequest,
  BatchBindDeviceRequest,
  ControlDeviceRequest,
  ControlDeviceResponse,
  DeviceControlLogItem,
  DeviceControlLogListResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

interface ApiError {
  code: string;
  message: string;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

type DeviceRaw = Partial<Device> & {
  ID?: string;
  TenantID?: string;
  Name?: string;
  Status?: string;
  FirmwareVersion?: string;
  LastHeartbeat?: string | null;
  ParkingLotID?: string | null;
  ParkingLotName?: string | null;
  GateID?: string | null;
  GateName?: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
};

type DeviceListRaw = {
  items?: DeviceRaw[];
  total?: number;
  page?: number;
  page_size?: number;
  Items?: DeviceRaw[];
  Total?: number;
  Page?: number;
  PageSize?: number;
};

type DeviceControlLogRaw = Partial<DeviceControlLogItem> & {
  ID?: string;
  OperatorID?: string;
  OperatorName?: string;
  Command?: string;
  CreatedAt?: string;
};

type DeviceControlLogListRaw = {
  items?: DeviceControlLogRaw[];
  total?: number;
  page?: number;
  page_size?: number;
  Items?: DeviceControlLogRaw[];
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
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let errorBody: ApiError = { code: 'UNKNOWN_ERROR', message: '请求失败，请重试' };
    try {
      errorBody = await res.json();
    } catch {
      // ignore parse error
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
    typeof payload === 'object' &&
    'code' in payload &&
    'message' in payload &&
    'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

function mapDevice(raw: DeviceRaw): Device {
  return {
    id: raw.id ?? raw.ID ?? '',
    tenant_id: raw.tenant_id ?? raw.TenantID ?? '',
    name: raw.name ?? raw.Name ?? '',
    status: (raw.status ?? raw.Status ?? 'pending') as Device['status'],
    firmware_version: raw.firmware_version ?? raw.FirmwareVersion ?? '',
    last_heartbeat: raw.last_heartbeat ?? raw.LastHeartbeat ?? null,
    parking_lot_id: raw.parking_lot_id ?? raw.ParkingLotID ?? null,
    parking_lot_name: raw.parking_lot_name ?? raw.ParkingLotName ?? null,
    gate_id: raw.gate_id ?? raw.GateID ?? null,
    gate_name: raw.gate_name ?? raw.GateName ?? null,
    created_at: raw.created_at ?? raw.CreatedAt ?? '',
    updated_at: raw.updated_at ?? raw.UpdatedAt ?? '',
  };
}

function mapDeviceDetail(raw: DeviceRaw): DeviceDetail {
  return {
    id: raw.id ?? raw.ID ?? '',
    tenant_id: raw.tenant_id ?? raw.TenantID ?? '',
    name: raw.name ?? raw.Name ?? '',
    status: (raw.status ?? raw.Status ?? 'pending') as DeviceDetail['status'],
    firmware_version: raw.firmware_version ?? raw.FirmwareVersion ?? '',
    last_heartbeat: raw.last_heartbeat ?? raw.LastHeartbeat ?? null,
    parking_lot_id: raw.parking_lot_id ?? raw.ParkingLotID ?? null,
    gate_id: raw.gate_id ?? raw.GateID ?? null,
    created_at: raw.created_at ?? raw.CreatedAt ?? '',
    updated_at: raw.updated_at ?? raw.UpdatedAt ?? '',
  };
}

function mapDeviceList(raw: DeviceListRaw): DeviceListResponse {
  return {
    items: (raw.items ?? raw.Items ?? []).map(mapDevice),
    total: raw.total ?? raw.Total ?? 0,
    page: raw.page ?? raw.Page ?? 1,
    page_size: raw.page_size ?? raw.PageSize ?? 20,
  };
}

function mapDeviceControlLog(raw: DeviceControlLogRaw): DeviceControlLogItem {
  return {
    id: raw.id ?? raw.ID ?? '',
    operator_id: raw.operator_id ?? raw.OperatorID ?? '',
    operator_name: raw.operator_name ?? raw.OperatorName ?? '',
    command: raw.command ?? raw.Command ?? '',
    created_at: raw.created_at ?? raw.CreatedAt ?? '',
  };
}

function mapDeviceControlLogList(raw: DeviceControlLogListRaw): DeviceControlLogListResponse {
  return {
    items: (raw.items ?? raw.Items ?? []).map(mapDeviceControlLog),
    total: raw.total ?? raw.Total ?? 0,
    page: raw.page ?? raw.Page ?? 1,
    page_size: raw.page_size ?? raw.PageSize ?? 20,
  };
}

function buildQueryString(filter: DeviceFilter): string {
  const params = new URLSearchParams();

  if (filter.parking_lot_id) {
    params.append('parking_lot_id', filter.parking_lot_id);
  }
  if (filter.gate_id) {
    params.append('gate_id', filter.gate_id);
  }
  if (filter.status && filter.status !== 'all') {
    params.append('status', filter.status);
  }
  if (filter.keyword) {
    params.append('keyword', filter.keyword);
  }
  if (filter.page) {
    params.append('page', filter.page.toString());
  }
  if (filter.page_size) {
    params.append('page_size', filter.page_size.toString());
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

type DeviceStatsRaw = Partial<DeviceStats> & {
  Total?: number;
  Active?: number;
  Offline?: number;
  Pending?: number;
  Disabled?: number;
};

export async function getDeviceStats(accessToken: string): Promise<DeviceStats> {
  const response = await request<DeviceStatsRaw | ApiEnvelope<DeviceStatsRaw>>(
    '/api/v1/devices/stats',
    {},
    accessToken
  );
  const raw = unwrapResponse(response);
  return {
    total: raw.total ?? raw.Total ?? 0,
    active: raw.active ?? raw.Active ?? 0,
    offline: raw.offline ?? raw.Offline ?? 0,
    pending: raw.pending ?? raw.Pending ?? 0,
    disabled: raw.disabled ?? raw.Disabled ?? 0,
  };
}

export async function createDevice(
  req: CreateDeviceRequest,
  accessToken: string
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    '/api/v1/devices',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
    accessToken
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function getDevices(
  filter: DeviceFilter,
  accessToken: string
): Promise<DeviceListResponse> {
  const queryString = buildQueryString(filter);
  const response = await request<DeviceListRaw | ApiEnvelope<DeviceListRaw>>(
    `/api/v1/devices${queryString}`,
    {},
    accessToken
  );
  return mapDeviceList(unwrapResponse(response));
}

export async function getDevice(
  id: string,
  accessToken: string
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}`,
    {},
    accessToken
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function getDeviceControlLogs(
  id: string,
  page: number,
  pageSize: number,
  accessToken: string
): Promise<DeviceControlLogListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const response = await request<DeviceControlLogListRaw | ApiEnvelope<DeviceControlLogListRaw>>(
    `/api/v1/devices/${id}/control-logs?${params.toString()}`,
    {},
    accessToken
  );
  return mapDeviceControlLogList(unwrapResponse(response));
}

export async function updateDeviceName(
  id: string,
  req: UpdateDeviceNameRequest,
  accessToken: string
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(req),
    },
    accessToken
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function bindDevice(
  id: string,
  req: BindDeviceRequest,
  accessToken: string
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}/bind`,
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
    accessToken
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function unbindDevice(
  id: string,
  accessToken: string
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}/unbind`,
    {
      method: 'POST',
    },
    accessToken
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function disableDevice(
  id: string,
  accessToken: string
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}/disable`,
    {
      method: 'POST',
    },
    accessToken
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function enableDevice(
  id: string,
  accessToken: string
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}/enable`,
    {
      method: 'POST',
    },
    accessToken
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function deleteDevice(
  id: string,
  accessToken: string
): Promise<void> {
  await request<{ code: number; message: string }>(
    `/api/v1/devices/${id}`,
    {
      method: 'DELETE',
    },
    accessToken
  );
}

export async function batchDisableDevices(
  req: BatchDeviceActionRequest,
  accessToken: string
): Promise<void> {
  await request<{ code: number; message: string }>(
    '/api/v1/devices/batch-disable',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
    accessToken
  );
}

export async function batchEnableDevices(
  req: BatchDeviceActionRequest,
  accessToken: string
): Promise<void> {
  await request<{ code: number; message: string }>(
    '/api/v1/devices/batch-enable',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
    accessToken
  );
}

export async function batchDeleteDevices(
  req: BatchDeviceActionRequest,
  accessToken: string
): Promise<void> {
  await request<{ code: number; message: string }>(
    '/api/v1/devices/batch-delete',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
    accessToken
  );
}

export async function batchBindDevices(
  req: BatchBindDeviceRequest,
  accessToken: string
): Promise<void> {
  await request<{ code: number; message: string }>(
    '/api/v1/devices/batch-bind',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
    accessToken
  );
}

export async function controlDevice(
  id: string,
  req: ControlDeviceRequest,
  accessToken: string
): Promise<ControlDeviceResponse> {
  const response = await request<ControlDeviceResponse | ApiEnvelope<ControlDeviceResponse>>(
    `/api/v1/devices/${id}/control`,
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
    accessToken
  );
  return unwrapResponse(response);
}
