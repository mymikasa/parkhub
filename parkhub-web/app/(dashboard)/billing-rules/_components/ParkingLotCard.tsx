"use client";

import { Check } from "lucide-react";
import type { ParkingLot } from "@/lib/parking-lot/types";
import { getLotColor, getLotIcon } from "./constants";

export function ParkingLotCard({ lot, index, isSelected, onClick }: {
  lot: ParkingLot;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const inactive = lot.status !== "active";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
          : "border-gray-200 hover:border-gray-300"
      } ${inactive ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${inactive ? "from-gray-400 to-gray-500" : getLotColor(index)} flex items-center justify-center`}>
            <i className={`${getLotIcon(index)} text-white text-sm`} />
          </div>
          <div>
            <div className="font-medium text-gray-900 text-sm">{lot.name}</div>
            <div className="text-xs text-gray-500">
              {inactive ? "暂停运营" : `${lot.total_spaces} 车位`}
            </div>
          </div>
        </div>
        {isSelected && <Check className="h-4 w-4 text-blue-600" />}
      </div>
    </button>
  );
}
