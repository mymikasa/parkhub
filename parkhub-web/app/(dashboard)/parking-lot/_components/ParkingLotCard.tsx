"use client";

import { ArrowRightToLine, ArrowRightFromLine, MapPin } from "lucide-react";
import type { ParkingLot, ParkingLotStatus } from "@/lib/parking-lot/types";
import {
  formatNumber,
  getLotIcon,
  getUsageRateStyles,
  getUsageRateTextColor,
} from "./constants";

function StatusBadge({ status }: { status: ParkingLotStatus }) {
  const isActive = status === "active";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        isActive
          ? "bg-emerald-50 text-emerald-700 glow-normal"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? "bg-emerald-500 status-dot" : "bg-gray-400"
        }`}
      />
      {isActive ? "运营中" : "暂停运营"}
    </span>
  );
}

interface ParkingLotCardProps {
  lot: ParkingLot;
  onEdit: () => void;
  onConfig: () => void;
}

export function ParkingLotCard({ lot, onEdit, onConfig }: ParkingLotCardProps) {
  const { icon: Icon, gradient } = getLotIcon(lot.name);
  const usageRate = lot.usage_rate;
  const { color: usageColor, glow: usageGlow } = getUsageRateStyles(
    usageRate,
    lot.status
  );
  const textColor = getUsageRateTextColor(usageRate, lot.status);

  return (
    <div className="bg-white rounded-xl border border-surface-border overflow-hidden card-hover">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">
                {lot.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                <MapPin className="h-3 w-3 text-gray-400 mr-1 inline" />
                {lot.address}
              </p>
            </div>
          </div>
          <StatusBadge status={lot.status} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(lot.total_spaces)}
            </div>
            <div className="text-xs text-gray-500 mt-1">总车位</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">
              {formatNumber(lot.available_spaces)}
            </div>
            <div className="text-xs text-gray-500 mt-1">剩余</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-brand-600">
              {lot.entry_count + lot.exit_count}
            </div>
            <div className="text-xs text-gray-500 mt-1">出入口</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500">使用率</span>
            <span className={`font-medium ${textColor}`}>
              {usageRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full progress-bar ${usageGlow} ${usageColor}`}
              style={{ width: `${Math.min(usageRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            <ArrowRightToLine className="h-3 w-3 text-emerald-500 mr-1 inline" />
            入口 {lot.entry_count}
          </span>
          <span>
            <ArrowRightFromLine className="h-3 w-3 text-blue-500 mr-1 inline" />
            出口 {lot.exit_count}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onConfig}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            配置出入口
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={onEdit}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}
