"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBuilding, faShop, faHouseChimney } from "@fortawesome/free-solid-svg-icons";
import type { ParkingLot } from "@/lib/parking-lot/types";

interface ParkingAvailabilityProps {
  parkingLots: ParkingLot[];
}

const lotIcons = [faBuilding, faShop, faHouseChimney];
const lotColors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500"];

export function ParkingAvailability({ parkingLots }: ParkingAvailabilityProps) {
  return (
    <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <span className="text-sm font-medium text-gray-900">车场余位状态</span>
      </div>
      <div className="p-4 space-y-4">
        {parkingLots.map((lot, index) => {
          const usageRate = lot.total_spaces > 0
            ? ((lot.total_spaces - lot.available_spaces) / lot.total_spaces) * 100
            : 0;
          const isTight = lot.available_spaces / lot.total_spaces < 0.1;

          return (
            <div
              key={lot.id}
              className={`p-4 rounded-xl ${isTight ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg ${lotColors[index % lotColors.length]} flex items-center justify-center`}
                  >
                    <FontAwesomeIcon
                      icon={lotIcons[index % lotIcons.length]}
                      className="text-white text-xs"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{lot.name}</span>
                </div>
                {isTight ? (
                  <span className="text-xs text-red-500 font-medium">车位紧张</span>
                ) : (
                  <span className="text-xs text-gray-500">{lot.total_spaces}车位</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full progress-bar ${isTight ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${usageRate}%` }}
                  />
                </div>
                <span
                  className={`text-sm font-bold w-16 text-right ${isTight ? "text-red-600" : "text-emerald-600"}`}
                >
                  {lot.available_spaces} 余
                </span>
              </div>
            </div>
          );
        })}
        {parkingLots.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">暂无车场数据</div>
        )}
      </div>
    </div>
  );
}
