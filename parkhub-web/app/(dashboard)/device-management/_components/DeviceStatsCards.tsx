"use client";

import { Cpu, Wifi, WifiOff, Clock, ShieldOff, TriangleAlert } from "lucide-react";
import { formatCount, formatPercent } from "./constants";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  isLoading: boolean;
  footer: string;
  onClick: () => void;
  active: boolean;
}

function StatsCard({
  title,
  value,
  icon: IconComponent,
  iconBg,
  iconColor,
  valueColor,
  isLoading,
  footer,
  onClick,
  active,
}: StatsCardProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border text-left card-hover transition-all focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
        active
          ? "border-brand-200 bg-brand-50/40 shadow-sm"
          : "border-surface-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          {isLoading ? (
            <div className="h-8 w-14 bg-gray-100 rounded mt-1 animate-pulse" />
          ) : (
            <p className={`text-2xl font-bold mt-1 ${valueColor}`}>
              {formatCount(value)}
            </p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          <IconComponent className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500">{footer}</div>
    </button>
  );
}

interface DeviceStatsCardsProps {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  pendingDevices: number;
  disabledDevices: number;
  total: number;
  onlineRate: string;
  isLoadingStats: boolean;
  activeStatusFilter: string;
  setActiveStatusFilter: (filter: "all" | "active" | "offline" | "pending" | "disabled") => void;
  heartbeatTimedOutCount: number;
  hasAttention: boolean;
}

export function DeviceStatsCards({
  totalDevices,
  onlineDevices,
  offlineDevices,
  pendingDevices,
  disabledDevices,
  total,
  onlineRate,
  isLoadingStats,
  activeStatusFilter,
  setActiveStatusFilter,
  heartbeatTimedOutCount,
  hasAttention,
}: DeviceStatsCardsProps) {
  return (
    <>
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <StatsCard
            title="设备总数"
            value={totalDevices}
            icon={Cpu}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            valueColor="text-gray-900"
            isLoading={isLoadingStats}
            footer={`当前结果 ${formatCount(total)} 条`}
            onClick={() => setActiveStatusFilter("all")}
            active={activeStatusFilter === "all"}
          />
          <StatsCard
            title="在线设备"
            value={onlineDevices}
            icon={Wifi}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            valueColor="text-emerald-600"
            isLoading={isLoadingStats}
            footer={`在线率 ${onlineRate}`}
            onClick={() => setActiveStatusFilter("active")}
            active={activeStatusFilter === "active"}
          />
          <StatsCard
            title="离线设备"
            value={offlineDevices}
            icon={WifiOff}
            iconBg="bg-red-50"
            iconColor="text-red-500"
            valueColor="text-red-600"
            isLoading={isLoadingStats}
            footer={offlineDevices > 0 ? "需要优先处理" : "当前运行正常"}
            onClick={() => setActiveStatusFilter("offline")}
            active={activeStatusFilter === "offline"}
          />
          <StatsCard
            title="待分配"
            value={pendingDevices}
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            valueColor="text-amber-700"
            isLoading={isLoadingStats}
            footer="等待完成车场与闸口绑定"
            onClick={() => setActiveStatusFilter("pending")}
            active={activeStatusFilter === "pending"}
          />
          <StatsCard
            title="已禁用"
            value={disabledDevices}
            icon={ShieldOff}
            iconBg="bg-slate-100"
            iconColor="text-slate-600"
            valueColor="text-slate-700"
            isLoading={isLoadingStats}
            footer="维修、停用或报废设备"
            onClick={() => setActiveStatusFilter("disabled")}
            active={activeStatusFilter === "disabled"}
          />
        </div>
      </div>

      {hasAttention && (
        <div className="px-8 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <TriangleAlert className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="font-medium text-red-800">
                  当前存在需要关注的设备状态
                </div>
                <div className="text-sm text-red-600 mt-0.5">
                  {offlineDevices > 0 && `离线 ${formatCount(offlineDevices)} 台`}
                  {offlineDevices > 0 &&
                  (pendingDevices > 0 || heartbeatTimedOutCount > 0)
                    ? "，"
                    : ""}
                  {pendingDevices > 0 && `待分配 ${formatCount(pendingDevices)} 台`}
                  {pendingDevices > 0 && heartbeatTimedOutCount > 0 ? "，" : ""}
                  {heartbeatTimedOutCount > 0 &&
                    `当前页心跳超时 ${formatCount(heartbeatTimedOutCount)} 台`}
                  。建议先处理连接异常，再完成设备绑定。
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {offlineDevices > 0 && (
                <button
                  onClick={() => setActiveStatusFilter("offline")}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  查看离线 →
                </button>
              )}
              {pendingDevices > 0 && (
                <button
                  onClick={() => setActiveStatusFilter("pending")}
                  className="text-sm text-amber-700 hover:text-amber-800 font-medium"
                >
                  查看待分配 →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
