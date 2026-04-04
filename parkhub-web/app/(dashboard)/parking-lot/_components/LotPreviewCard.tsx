"use client";

import { formatNumber, getLotIcon, getUsageRateStyles, getUsageRateTextColor, getLotTypeLabel } from "./constants";
import type { ParkingLot } from "@/lib/parking-lot/types";

interface LotPreviewCardProps {
  lot: ParkingLot;
  status: string;
  lotType: string;
  currentTotalSpaces: number;
}

export function LotPreviewCard({ lot, status, lotType, currentTotalSpaces }: LotPreviewCardProps) {
  const { icon: LotIcon, gradient } = getLotIcon(lot.name);
  const usageStyles = getUsageRateStyles(lot.usage_rate, lot.status);
  const usageTextColor = getUsageRateTextColor(lot.usage_rate, lot.status);
  const currentStatus = status === "active" ? "运营中" : "暂停运营";
  const currentLotTypeLabel = getLotTypeLabel(lotType);

  return (
    <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_55%,#eef6ff_100%)] p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`mt-0.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg shadow-blue-500/15`}
          >
            <LotIcon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{lot.name}</h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                {currentStatus}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{lot.address}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-white/90 px-2.5 py-1 ring-1 ring-slate-200">{currentLotTypeLabel}</span>
              <span className="rounded-full bg-white/90 px-2.5 py-1 ring-1 ring-slate-200">出入口 {lot.entry_count + lot.exit_count}</span>
              <span className="rounded-full bg-white/90 px-2.5 py-1 ring-1 ring-slate-200">剩余 {formatNumber(lot.available_spaces)}</span>
            </div>
          </div>
        </div>
        <div className="min-w-[220px] rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/80 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>当前使用率</span>
            <span className={`font-semibold ${usageTextColor}`}>{lot.usage_rate.toFixed(1)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${usageStyles.color} ${usageStyles.glow}`}
              style={{ width: `${Math.min(lot.usage_rate, 100)}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-[0.08em] text-gray-400">总车位</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(currentTotalSpaces || 0)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-[0.08em] text-gray-400">当前类型</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{currentLotTypeLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
