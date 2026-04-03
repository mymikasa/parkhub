import { request, unwrapResponse, type ApiEnvelope } from '@/lib/api';
import type {
  Device,
  DeviceDetail,
  DeviceListResponse,
  DeviceFilter,
  DeviceParkingLotStats,
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
  by_parking_lot?: DeviceParkingLotStatsRaw[];
  ByParkingLot?: DeviceParkingLotStatsRaw[];
  Total?: number;
  active?: number;
  Online?: number;
  Active?: number;
  Offline?: number;
  Pending?: number;
  Disabled?: number;
};

type DeviceParkingLotStatsRaw = Partial<DeviceParkingLotStats> & {
  ParkingLotID?: string;
  ParkingLotName?: string;
  Total?: number;
  active?: number;
  Online?: number;
  Active?: number;
  Offline?: number;
  Pending?: number;
  Disabled?: number;
};

function mapDeviceParkingLotStats(raw: DeviceParkingLotStatsRaw): DeviceParkingLotStats {
  return {
    parking_lot_id: raw.parking_lot_id ?? raw.ParkingLotID ?? '',
    parking_lot_name: raw.parking_lot_name ?? raw.ParkingLotName ?? '',
    total: raw.total ?? raw.Total ?? 0,
    online: raw.online ?? raw.Online ?? raw.active ?? raw.Active ?? 0,
    offline: raw.offline ?? raw.Offline ?? 0,
    pending: raw.pending ?? raw.Pending ?? 0,
    disabled: raw.disabled ?? raw.Disabled ?? 0,
  };
}

export async function getDeviceStats(): Promise<DeviceStats> {
  const response = await request<DeviceStatsRaw | ApiEnvelope<DeviceStatsRaw>>(
    '/api/v1/devices/stats',
  );
  const raw = unwrapResponse(response);
  return {
    total: raw.total ?? raw.Total ?? 0,
    online: raw.online ?? raw.Online ?? raw.active ?? raw.Active ?? 0,
    offline: raw.offline ?? raw.Offline ?? 0,
    pending: raw.pending ?? raw.Pending ?? 0,
    disabled: raw.disabled ?? raw.Disabled ?? 0,
    by_parking_lot: (raw.by_parking_lot ?? raw.ByParkingLot ?? []).map(mapDeviceParkingLotStats),
  };
}

export async function createDevice(
  req: CreateDeviceRequest,
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    '/api/v1/devices',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function getDevices(
  filter: DeviceFilter,
): Promise<DeviceListResponse> {
  const queryString = buildQueryString(filter);
  const response = await request<DeviceListRaw | ApiEnvelope<DeviceListRaw>>(
    `/api/v1/devices${queryString}`,
  );
  return mapDeviceList(unwrapResponse(response));
}

export async function getDevice(
  id: string,
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}`,
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function getDeviceControlLogs(
  id: string,
  page: number,
  pageSize: number,
): Promise<DeviceControlLogListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const response = await request<DeviceControlLogListRaw | ApiEnvelope<DeviceControlLogListRaw>>(
    `/api/v1/devices/${id}/control-logs?${params.toString()}`,
  );
  return mapDeviceControlLogList(unwrapResponse(response));
}

export async function updateDeviceName(
  id: string,
  req: UpdateDeviceNameRequest,
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(req),
    },
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function bindDevice(
  id: string,
  req: BindDeviceRequest,
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}/bind`,
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function unbindDevice(
  id: string,
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}/unbind`,
    {
      method: 'POST',
    },
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function disableDevice(
  id: string,
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}/disable`,
    {
      method: 'POST',
    },
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function enableDevice(
  id: string,
): Promise<DeviceDetail> {
  const response = await request<DeviceRaw | ApiEnvelope<DeviceRaw>>(
    `/api/v1/devices/${id}/enable`,
    {
      method: 'POST',
    },
  );
  return mapDeviceDetail(unwrapResponse(response));
}

export async function deleteDevice(
  id: string,
): Promise<void> {
  await request<{ code: number; message: string }>(
    `/api/v1/devices/${id}`,
    {
      method: 'DELETE',
    },
  );
}

export async function batchDisableDevices(
  req: BatchDeviceActionRequest,
): Promise<void> {
  await request<{ code: number; message: string }>(
    '/api/v1/devices/batch-disable',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
  );
}

export async function batchEnableDevices(
  req: BatchDeviceActionRequest,
): Promise<void> {
  await request<{ code: number; message: string }>(
    '/api/v1/devices/batch-enable',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
  );
}

export async function batchDeleteDevices(
  req: BatchDeviceActionRequest,
): Promise<void> {
  await request<{ code: number; message: string }>(
    '/api/v1/devices/batch-delete',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
  );
}

export async function batchBindDevices(
  req: BatchBindDeviceRequest,
): Promise<void> {
  await request<{ code: number; message: string }>(
    '/api/v1/devices/batch-bind',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
  );
}

export async function controlDevice(
  id: string,
  req: ControlDeviceRequest,
): Promise<ControlDeviceResponse> {
  const response = await request<ControlDeviceResponse | ApiEnvelope<ControlDeviceResponse>>(
    `/api/v1/devices/${id}/control`,
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
  );
  return unwrapResponse(response);
}
