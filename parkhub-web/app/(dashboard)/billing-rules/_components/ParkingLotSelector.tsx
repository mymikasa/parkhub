"use client";

import { Check } from "lucide-react";
import type { ParkingLot } from "@/lib/parking-lot/types";
import { getLotColor, getLotIcon } from "./constants";

interface ParkingLotSelectorProps {
  parkingLots: ParkingLot[];
  selectedLotId: string;
  onSelect: (id: string) => void;
}

export function ParkingLotSelector({
  parkingLots,
  selectedLotId,
  onSelect,
}: ParkingLotSelectorProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-900">选择停车场</span>
      </div>
      <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {parkingLots.map((lot, index) => {
          const inactive = lot.status !== "active";
          return (
            <button
              key={lot.id}
              onClick={() => onSelect(lot.id)}
              className={`w-full text-left p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedLotId === lot.id
                  ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                  : "border-gray-200 hover:border-gray-300"
              } ${inactive ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                      inactive
                        ? "from-gray-400 to-gray-500"
                        : getLotColor(index)
                    } flex items-center justify-center`}
                  >
                    <i
                      className={`${getLotIcon(index)} text-white text-sm`}
                    />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {lot.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {inactive ? "暂停运营" : `${lot.total_spaces} 车位`}
                    </div>
                  </div>
                </div>
                {selectedLotId === lot.id && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
