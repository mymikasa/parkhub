import type {
  ParkingLot,
  ParkingLotListResponse,
  CreateParkingLotRequest,
  UpdateParkingLotRequest,
  ParkingLotFilter,
  ParkingLotStats,
  Gate,
  GateWithDevice,
  CreateGateRequest,
  UpdateGateRequest,
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

type ParkingLotRaw = Partial<ParkingLot> & {
  ID?: string;
  Name?: string;
  Address?: string;
  TotalSpaces?: number;
  AvailableSpaces?: number;
  LotType?: string;
  Status?: string;
  EntryCount?: number;
  ExitCount?: number;
  UsageRate?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
};

type ParkingLotListRaw = {
  items?: ParkingLotRaw[];
  total?: number;
  page?: number;
  page_size?: number;
  Items?: ParkingLotRaw[];
  Total?: number;
  Page?: number;
  PageSize?: number;
};

type ParkingLotStatsRaw = Partial<ParkingLotStats> & {
  TotalSpaces?: number;
  AvailableSpaces?: number;
  OccupiedVehicles?: number;
  TotalGates?: number;
};

type GateDeviceInfoRaw = {
  id?: string;
  serial_number?: string;
  status?: 'online' | 'offline';
  last_heartbeat?: string;
  ID?: string;
  SerialNumber?: string;
  Status?: 'online' | 'offline';
  LastHeartbeat?: string;
};

type GateRaw = Partial<GateWithDevice> & {
  id?: string;
  parking_lot_id?: string;
  name?: string;
  type?: 'entry' | 'exit';
  device_id?: string | null;
  created_at?: string;
  updated_at?: string;
  device?: GateDeviceInfoRaw | null;
  bound_device_count?: number;
  offline_device_count?: number;
  ID?: string;
  ParkingLotID?: string;
  Name?: string;
  Type?: 'entry' | 'exit';
  DeviceID?: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
  Device?: GateDeviceInfoRaw | null;
  BoundDeviceCount?: number;
  OfflineDeviceCount?: number;
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

function mapParkingLot(raw: ParkingLotRaw): ParkingLot {
  return {
    id: raw.id ?? raw.ID ?? '',
    name: raw.name ?? raw.Name ?? '',
    address: raw.address ?? raw.Address ?? '',
    total_spaces: raw.total_spaces ?? raw.TotalSpaces ?? 0,
    available_spaces: raw.available_spaces ?? raw.AvailableSpaces ?? 0,
    lot_type: (raw.lot_type ?? raw.LotType ?? 'underground') as ParkingLot['lot_type'],
    status: (raw.status ?? raw.Status ?? 'inactive') as ParkingLot['status'],
    entry_count: raw.entry_count ?? raw.EntryCount ?? 0,
    exit_count: raw.exit_count ?? raw.ExitCount ?? 0,
    usage_rate: raw.usage_rate ?? raw.UsageRate ?? 0,
    created_at: raw.created_at ?? raw.CreatedAt ?? '',
    updated_at: raw.updated_at ?? raw.UpdatedAt ?? '',
  };
}

function mapParkingLotList(raw: ParkingLotListRaw): ParkingLotListResponse {
  return {
    items: (raw.items ?? raw.Items ?? []).map(mapParkingLot),
    total: raw.total ?? raw.Total ?? 0,
    page: raw.page ?? raw.Page ?? 1,
    page_size: raw.page_size ?? raw.PageSize ?? 20,
  };
}

function mapParkingLotStats(raw: ParkingLotStatsRaw): ParkingLotStats {
  return {
    total_spaces: raw.total_spaces ?? raw.TotalSpaces ?? 0,
    available_spaces: raw.available_spaces ?? raw.AvailableSpaces ?? 0,
    occupied_vehicles: raw.occupied_vehicles ?? raw.OccupiedVehicles ?? 0,
    total_gates: raw.total_gates ?? raw.TotalGates ?? 0,
  };
}

function mapGate(raw: GateRaw): GateWithDevice {
  const device = raw.device ?? raw.Device;

  return {
    id: raw.id ?? raw.ID ?? '',
    parking_lot_id: raw.parking_lot_id ?? raw.ParkingLotID ?? '',
    name: raw.name ?? raw.Name ?? '',
    type: (raw.type ?? raw.Type ?? 'entry') as GateWithDevice['type'],
    device_id: raw.device_id ?? raw.DeviceID ?? null,
    created_at: raw.created_at ?? raw.CreatedAt ?? '',
    updated_at: raw.updated_at ?? raw.UpdatedAt ?? '',
    bound_device_count: raw.bound_device_count ?? raw.BoundDeviceCount ?? 0,
    offline_device_count: raw.offline_device_count ?? raw.OfflineDeviceCount ?? 0,
    device: device
      ? {
          id: device.id ?? device.ID ?? '',
          serial_number: device.serial_number ?? device.SerialNumber ?? '',
          status: (device.status ?? device.Status ?? 'offline') as 'online' | 'offline',
          last_heartbeat: device.last_heartbeat ?? device.LastHeartbeat ?? '',
        }
      : null,
  };
}

function buildQueryString(filter: ParkingLotFilter): string {
  const params = new URLSearchParams();

  if (filter.status && filter.status !== 'all') {
    params.append('status', filter.status);
  }
  if (filter.search) {
    params.append('search', filter.search);
  }
  if (filter.tenant_id) {
    params.append('tenant_id', filter.tenant_id);
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

export async function getParkingLots(
  filter: ParkingLotFilter,
  accessToken: string
): Promise<ParkingLotListResponse> {
  const queryString = buildQueryString(filter);
  const response = await request<ParkingLotListRaw | ApiEnvelope<ParkingLotListRaw>>(
    `/api/v1/parking-lots${queryString}`,
    {},
    accessToken
  );
  return mapParkingLotList(unwrapResponse(response));
}

export async function getParkingLot(id: string, accessToken: string): Promise<ParkingLot> {
  const response = await request<ParkingLotRaw | ApiEnvelope<ParkingLotRaw>>(
    `/api/v1/parking-lots/${id}`,
    {},
    accessToken
  );
  return mapParkingLot(unwrapResponse(response));
}

export async function createParkingLot(
  req: CreateParkingLotRequest,
  accessToken: string
): Promise<ParkingLot> {
  const response = await request<ParkingLotRaw | ApiEnvelope<ParkingLotRaw>>('/api/v1/parking-lots', {
    method: 'POST',
    body: JSON.stringify(req),
  }, accessToken);
  return mapParkingLot(unwrapResponse(response));
}

export async function updateParkingLot(
  id: string,
  req: UpdateParkingLotRequest,
  accessToken: string
): Promise<ParkingLot> {
  const response = await request<ParkingLotRaw | ApiEnvelope<ParkingLotRaw>>(`/api/v1/parking-lots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  }, accessToken);
  return mapParkingLot(unwrapResponse(response));
}

export async function getParkingLotStats(accessToken: string): Promise<ParkingLotStats> {
  const response = await request<ParkingLotStatsRaw | ApiEnvelope<ParkingLotStatsRaw>>(
    '/api/v1/parking-lots/stats',
    {},
    accessToken
  );
  return mapParkingLotStats(unwrapResponse(response));
}

// Gate APIs
export async function getGates(
  parkingLotId: string,
  accessToken: string
): Promise<GateWithDevice[]> {
  const response = await request<GateRaw[] | ApiEnvelope<GateRaw[]>>(
    `/api/v1/parking-lots/${parkingLotId}/gates`,
    {},
    accessToken
  );
  return unwrapResponse(response).map(mapGate);
}

export async function createGate(
  parkingLotId: string,
  req: CreateGateRequest,
  accessToken: string
): Promise<Gate> {
  const response = await request<GateRaw | ApiEnvelope<GateRaw>>(`/api/v1/parking-lots/${parkingLotId}/gates`, {
    method: 'POST',
    body: JSON.stringify(req),
  }, accessToken);
  return mapGate(unwrapResponse(response));
}

export async function updateGate(
  id: string,
  req: UpdateGateRequest,
  accessToken: string
): Promise<Gate> {
  const response = await request<GateRaw | ApiEnvelope<GateRaw>>(`/api/v1/gates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  }, accessToken);
  return mapGate(unwrapResponse(response));
}

export async function deleteGate(id: string, accessToken: string): Promise<void> {
  return request<void>(`/api/v1/gates/${id}`, {
    method: 'DELETE',
  }, accessToken);
}
