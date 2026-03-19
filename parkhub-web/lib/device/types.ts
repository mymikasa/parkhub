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

export interface CreateDeviceRequest {
  id: string;
  name?: string;
}

export interface UpdateDeviceNameRequest {
  name: string;
}

export interface BindDeviceRequest {
  tenant_id: string;
  parking_lot_id: string;
  gate_id: string;
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

export interface ControlDeviceRequest {
  command: 'open_gate';
}

export interface ControlDeviceResponse {
  success: boolean;
}

export interface DeviceControlLogItem {
  id: string;
  operator_id: string;
  operator_name: string;
  command: string;
  created_at: string;
}

export interface DeviceControlLogListResponse {
  items: DeviceControlLogItem[];
  total: number;
  page: number;
  page_size: number;
}
