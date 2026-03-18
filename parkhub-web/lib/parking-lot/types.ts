export type LotType = 'underground' | 'ground' | 'stereo';

export type ParkingLotStatus = 'active' | 'inactive';

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  total_spaces: number;
  available_spaces: number;
  lot_type: LotType;
  status: ParkingLotStatus;
  entry_count: number;
  exit_count: number;
  usage_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CreateParkingLotRequest {
  name: string;
  address: string;
  total_spaces: number;
  lot_type?: LotType;
}

export interface UpdateParkingLotRequest {
  name: string;
  address: string;
  total_spaces: number;
  lot_type?: LotType;
  status?: ParkingLotStatus;
}

export interface ParkingLotListResponse {
  items: ParkingLot[];
  total: number;
  page: number;
  page_size: number;
}

export interface ParkingLotFilter {
  status?: ParkingLotStatus | 'all';
  search?: string;
  tenant_id?: string;
  page?: number;
  page_size?: number;
}

export interface ParkingLotStats {
  total_spaces: number;
  available_spaces: number;
  occupied_vehicles: number;
  total_gates: number;
}

// Gate types
export type GateType = 'entry' | 'exit';

export interface Gate {
  id: string;
  parking_lot_id: string;
  name: string;
  type: GateType;
  device_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GateDeviceInfo {
  id: string;
  serial_number: string;
  status: 'online' | 'offline';
  last_heartbeat: string;
}

export interface GateWithDevice extends Gate {
  device: GateDeviceInfo | null;
  bound_device_count?: number;
  offline_device_count?: number;
}

export interface CreateGateRequest {
  name: string;
  type: GateType;
}

export interface UpdateGateRequest {
  name: string;
}
