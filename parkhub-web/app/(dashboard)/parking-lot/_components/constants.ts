import { Building2, Car, MapPin, ParkingCircle } from "lucide-react";
import type { ParkingLotStatus, LotType } from "@/lib/parking-lot/types";

// Icon gradients for parking lot cards
const LOT_ICON_GRADIENTS = [
  { icon: Building2, gradient: "from-blue-500 to-blue-600" },
  { icon: Car, gradient: "from-emerald-500 to-emerald-600" },
  { icon: ParkingCircle, gradient: "from-violet-500 to-violet-600" },
  { icon: MapPin, gradient: "from-amber-500 to-amber-600" },
];

export function getLotIcon(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOT_ICON_GRADIENTS[Math.abs(hash) % LOT_ICON_GRADIENTS.length];
}

export function formatNumber(num: number): string {
  return num.toLocaleString("zh-CN");
}

export function getUsageRateStyles(
  rate: number,
  status: ParkingLotStatus
): { color: string; glow: string } {
  if (status === "inactive") {
    return { color: "bg-gray-300", glow: "" };
  }
  if (rate >= 90) return { color: "bg-red-500", glow: "glow-danger" };
  if (rate >= 80) return { color: "bg-amber-500", glow: "glow-warning" };
  return { color: "bg-emerald-500", glow: "glow-normal" };
}

export function getUsageRateTextColor(
  rate: number,
  status: ParkingLotStatus
): string {
  if (status === "inactive") {
    return "text-gray-500";
  }
  if (rate >= 90) return "text-red-600";
  if (rate >= 80) return "text-gray-900";
  return "text-emerald-600";
}

export function getLotTypeLabel(lotType: LotType): string {
  switch (lotType) {
    case "ground":
      return "地面停车场";
    case "stereo":
      return "立体车库";
    default:
      return "地下停车场";
  }
}
