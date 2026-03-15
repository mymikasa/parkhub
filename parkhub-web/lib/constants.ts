// App constants
export const APP_NAME = "ParkHub";
export const APP_DESCRIPTION = "智慧停车管理平台";

// Routes
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  TENANT_MANAGEMENT: "/tenant-management",
  PARKING_LOT: "/parking-lot",
  DEVICE_MANAGEMENT: "/device-management",
  BILLING_RULES: "/billing-rules",
  REALTIME_MONITOR: "/realtime-monitor",
  ENTRY_EXIT_RECORDS: "/entry-exit-records",
  OPERATOR_WORKSPACE: "/operator-workspace",
  PAYMENT: "/payment",
} as const;

// Status colors
export const STATUS_COLORS = {
  ONLINE: "emerald",
  OFFLINE: "gray",
  WARNING: "amber",
  ERROR: "red",
} as const;

// Parking status
export const PARKING_STATUS = {
  AVAILABLE: "available",
  FULL: "full",
  TIGHT: "tight",
} as const;
