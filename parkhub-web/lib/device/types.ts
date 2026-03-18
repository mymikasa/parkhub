export type DeviceStatus = 'pending' | 'active' | 'offline' | 'disabled';

export interface Device {
  id: string;
  tenant_id: string;
  name: string;
  status: DeviceStatus;
  firmware_version: string;
  last_heartbeat: string | null;
  parking_lot_id: string | null;
  parking_lot_name: string | null;
  gate_id: string | null;
  gate_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceDetail {
  id: string;
  tenant_id: string;
  name: string;
  status: DeviceStatus;
  firmware_version: string;
  last_heartbeat: string | null;
  parking_lot_id: string | null;
  gate_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateDeviceNameRequest {
  name: string;
}

export interface DeviceListResponse {
  items: Device[];
  total: number;
  page: number;
  page_size: number;
}

export interface DeviceStats {
  total: number;
  active: number;
  offline: number;
  pending: number;
  disabled: number;
}

export interface DeviceFilter {
  parking_lot_id?: string;
  gate_id?: string;
  status?: DeviceStatus | 'all';
  keyword?: string;
  page?: number;
  page_size?: number;
}
