"use client";

import { Building2, CheckCircle2, Snowflake, Warehouse, TrendingUp } from "lucide-react";

interface TenantStatsCardsProps {
  stats: {
    total: number;
    active: number;
    frozen: number;
    parking_lots: number;
  };
  isLoading: boolean;
}

export function TenantStatsCards({ stats, isLoading }: TenantStatsCardsProps) {
  return (
    <div className="px-8 py-6">
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总租户数</p>
              {isLoading ? (
                <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="text-blue-600 w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            <TrendingUp className="text-emerald-500 w-3.5 h-3.5" />
            <span className="text-emerald-600">+12%</span>
            <span className="text-gray-400">较上月</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">正常运营</p>
              {isLoading ? (
                <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-600 w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 status-dot" />
            <span className="text-gray-400">占比 {!isLoading && stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : '-'}%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已冻结</p>
              {isLoading ? (
                <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.frozen}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <Snowflake className="text-red-500 w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span className="text-gray-400">欠费或违规</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">接入车场</p>
              {isLoading ? (
                <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.parking_lots}</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <Warehouse className="text-violet-600 w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span className="text-gray-400">平均 {!isLoading && stats.total > 0 ? (stats.parking_lots / stats.total).toFixed(1) : '-'} 个/租户</span>
          </div>
        </div>
      </div>
    </div>
  );
}
