// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  tenantId: string;
  tenantName: string;
}

// Parking lot types
export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  totalSpaces: number;
  availableSpaces: number;
  status: "active" | "inactive" | "maintenance";
}

// Device types
export interface Device {
  id: string;
  name: string;
  type: "camera" | "barrier" | "payment_terminal";
  parkingLotId: string;
  status: "online" | "offline" | "error";
  lastHeartbeat: string;
}

// Vehicle record types
export interface VehicleRecord {
  id: string;
  plateNumber: string;
  type: "entry" | "exit" | "anomaly";
  parkingLotName: string;
  gateName: string;
  timestamp: string;
  fee?: number;
  imageUrl?: string;
}

// Billing types
export interface BillingRule {
  id: string;
  name: string;
  type: "hourly" | "daily" | "monthly";
  baseFee: number;
  hourlyRate: number;
  maxDailyFee?: number;
}

// Navigation types
export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}
