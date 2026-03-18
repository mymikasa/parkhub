"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Icon } from "@/components/icons/FontAwesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Cpu,
  DoorOpen,
  HardDrive,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  TriangleAlert,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  useCreateDevice,
  useDevices,
  useDeviceStats,
  useUpdateDeviceName,
} from "@/lib/device/hooks";
import { usePermissions } from "@/lib/auth/hooks";
import type { Device, DeviceFilter, DeviceStatus } from "@/lib/device/types";

const STATUS_CONFIG: Record<
  DeviceStatus,
  {
    label: string;
    dotColor: string;
    softBg: string;
    textColor: string;
    ringColor: string;
    iconBg: string;
    iconColor: string;
    icon: React.ElementType;
    emphasis: string;
    rowTint: string;
    note: string;
  }
> = {
  active: {
    label: "在线",
    dotColor: "bg-emerald-400",
    softBg: "bg-emerald-50",
    textColor: "text-emerald-700",
    ringColor: "ring-emerald-500/[0.15]",
    iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    iconColor: "text-white",
    icon: Wifi,
    emphasis: "from-emerald-500/[0.15] to-emerald-500/5",
    rowTint: "hover:bg-emerald-50/40",
    note: "链路稳定",
  },
  offline: {
    label: "离线",
    dotColor: "bg-rose-400",
    softBg: "bg-rose-50",
    textColor: "text-rose-700",
    ringColor: "ring-rose-500/[0.15]",
    iconBg: "bg-gradient-to-br from-rose-400 to-rose-600",
    iconColor: "text-white",
    icon: WifiOff,
    emphasis: "from-rose-500/[0.15] to-rose-500/5",
    rowTint: "bg-rose-50/30 hover:bg-rose-50/50",
    note: "需要恢复连接",
  },
  pending: {
    label: "待分配",
    dotColor: "bg-amber-400",
    softBg: "bg-amber-50",
    textColor: "text-amber-700",
    ringColor: "ring-amber-500/[0.15]",
    iconBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    iconColor: "text-white",
    icon: Clock,
    emphasis: "from-amber-500/[0.15] to-amber-500/5",
    rowTint: "bg-amber-50/30 hover:bg-amber-50/50",
    note: "等待部署绑定",
  },
  disabled: {
    label: "已禁用",
    dotColor: "bg-slate-400",
    softBg: "bg-slate-100",
    textColor: "text-slate-700",
    ringColor: "ring-slate-500/[0.15]",
    iconBg: "bg-gradient-to-br from-slate-400 to-slate-600",
    iconColor: "text-white",
    icon: ShieldOff,
    emphasis: "from-slate-500/[0.15] to-slate-500/5",
    rowTint: "bg-slate-100/50 hover:bg-slate-100/80",
    note: "当前不可用",
  },
};

function formatHeartbeat(heartbeat: string | null): {
  text: string;
  full: string;
} {
  if (!heartbeat) return { text: "暂无心跳", full: "未收到心跳" };
  const date = new Date(heartbeat);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const full = date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (diffMin < 1) return { text: "刚刚同步", full };
  if (diffMin < 60) return { text: `${diffMin} 分钟前`, full };
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { text: `${diffHours} 小时前`, full };
  const diffDays = Math.floor(diffHours / 24);
  return { text: `${diffDays} 天前`, full };
}

function isHeartbeatStale(
  heartbeat: string | null,
  thresholdMinutes = 15
): boolean {
  if (!heartbeat) return false;
  return Date.now() - new Date(heartbeat).getTime() > thresholdMinutes * 60000;
}

function generatePages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
}

function formatPercent(value: number, total: number): string {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function getAttentionText(device: Device, staleHeartbeat: boolean): string {
  if (device.status === "offline") return "设备离线，需要排查网络或供电";
  if (device.status === "pending") return "尚未完成车场或闸口绑定";
  if (device.status === "disabled") return "设备已禁用，不参与运行";
  if (staleHeartbeat) return "心跳延迟超过 15 分钟";
  return "运行稳定，链路正常";
}

export default function DeviceManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState<
    DeviceStatus | "all"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);

  const pageSize = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusFilter]);

  const filter: DeviceFilter = {
    keyword: debouncedSearch,
    status: activeStatusFilter === "all" ? undefined : activeStatusFilter,
    page: currentPage,
    page_size: pageSize,
  };

  const { data, isLoading, isFetching, refetch } = useDevices(filter);
  const { data: stats, isLoading: isLoadingStats } = useDeviceStats();
  const { isOperator } = usePermissions();

  const devices = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const totalDevices = stats?.total || 0;
  const activeDevices = stats?.active || 0;
  const offlineDevices = stats?.offline || 0;
  const pendingDevices = stats?.pending || 0;
  const disabledDevices = stats?.disabled || 0;
  const onlineRate = formatPercent(activeDevices, totalDevices);
  const staleHeartbeatCount = devices.filter(
    (device) => device.status === "active" && isHeartbeatStale(device.last_heartbeat)
  ).length;
  const hasAttention =
    offlineDevices > 0 || pendingDevices > 0 || staleHeartbeatCount > 0;

  return (
    <>
      <header className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">设备管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              管理设备注册、部署位置与在线状态
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="搜索设备名称或序列号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 h-10 pl-10 pr-10 rounded-lg border-gray-200 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              刷新
            </button>
            {!isOperator && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                注册设备
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-5">
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
            value={activeDevices}
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
            title="待分配 / 已禁用"
            value={pendingDevices + disabledDevices}
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            valueColor="text-gray-900"
            isLoading={isLoadingStats}
            footer={`待分配 ${formatCount(pendingDevices)} · 已禁用 ${formatCount(disabledDevices)}`}
            onClick={() =>
              setActiveStatusFilter(
                activeStatusFilter === "pending" ? "disabled" : "pending"
              )
            }
            active={
              activeStatusFilter === "pending" ||
              activeStatusFilter === "disabled"
            }
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
                  (pendingDevices > 0 || staleHeartbeatCount > 0)
                    ? "，"
                    : ""}
                  {pendingDevices > 0 && `待分配 ${formatCount(pendingDevices)} 台`}
                  {pendingDevices > 0 && staleHeartbeatCount > 0 ? "，" : ""}
                  {staleHeartbeatCount > 0 &&
                    `当前页心跳延迟 ${formatCount(staleHeartbeatCount)} 台`}
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

      <div className="px-8 pb-8">
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900">设备列表</span>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {[
                  ["all", "全部"],
                  ["active", "在线"],
                  ["offline", "离线"],
                  ["pending", "待分配"],
                  ["disabled", "已禁用"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setActiveStatusFilter(value as DeviceStatus | "all")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeStatusFilter === value
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>共 {formatCount(total)} 条记录</span>
            </div>
          </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-28">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand-50 text-brand-600">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-700">
                  正在加载设备数据
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  正在同步当前筛选条件下的设备状态。
                </p>
              </div>
            ) : devices.length === 0 ? (
              <EmptyState
                hasFilter={!!searchQuery || activeStatusFilter !== "all"}
                onClear={() => {
                  setSearchQuery("");
                  setActiveStatusFilter("all");
                }}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                        <TableHead className="pl-6 text-xs font-medium uppercase tracking-wider text-gray-500">
                          设备信息
                        </TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">
                          部署位置
                        </TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">
                          运行状态
                        </TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">
                          固件 / 心跳
                        </TableHead>
                        <TableHead className="pr-6 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          操作
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device, index) => (
                        <DeviceRow
                          key={device.id}
                          device={device}
                          canEdit={!isOperator}
                          onEdit={() => setEditDevice(device)}
                          index={index}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <Pagination
                    current={currentPage}
                    total={totalPages}
                    totalItems={total}
                    pageSize={pageSize}
                    onChange={setCurrentPage}
                  />
                )}
              </>
            )}
        </div>
      </div>

      <CreateDeviceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />
      <EditDeviceNameDialog
        device={editDevice}
        open={!!editDevice}
        onOpenChange={(open) => {
          if (!open) setEditDevice(null);
        }}
        onSuccess={() => {
          setEditDevice(null);
          refetch();
        }}
      />
    </>
  );
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
}: {
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
}) {
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

function DeviceRow({
  device,
  canEdit,
  onEdit,
  index,
}: {
  device: Device;
  canEdit: boolean;
  onEdit: () => void;
  index: number;
}) {
  const cfg = STATUS_CONFIG[device.status];
  const heartbeat = formatHeartbeat(device.last_heartbeat);
  const StatusIcon = cfg.icon;
  const staleHeartbeat =
    device.status === "active" && isHeartbeatStale(device.last_heartbeat);

  return (
    <TableRow
      className={`border-b border-slate-100/90 transition-colors ${cfg.rowTint}`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <TableCell className="pl-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${cfg.iconBg} shadow-sm`}
          >
            <StatusIcon className={`h-4 w-4 ${cfg.iconColor}`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">
                {device.name || "未命名设备"}
              </p>
              {staleHeartbeat && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                  心跳延迟
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-xs text-slate-400">
              {device.id}
            </p>
          </div>
        </div>
      </TableCell>

      <TableCell className="py-4">
        {device.parking_lot_name ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{device.parking_lot_name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <DoorOpen className="h-3.5 w-3.5" />
              <span className="truncate">{device.gate_name || "未绑定闸口"}</span>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
            <CircleAlert className="h-3.5 w-3.5" />
            尚未分配位置
          </div>
        )}
      </TableCell>

      <TableCell className="py-4">
        <div
          className={`inline-flex min-w-[132px] flex-col gap-1 rounded-2xl bg-gradient-to-br px-3.5 py-3 ${cfg.emphasis}`}
        >
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.softBg} ${cfg.textColor} ring-1 ${cfg.ringColor}`}
          >
            <span className="relative flex h-1.5 w-1.5">
              {device.status === "active" && (
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dotColor} opacity-75`}
                />
              )}
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.dotColor}`}
              />
            </span>
            {cfg.label}
          </span>
          <span className="text-xs text-slate-500">
            {staleHeartbeat ? "心跳延迟超过 15 分钟" : cfg.note}
          </span>
        </div>
      </TableCell>

      <TableCell className="py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <HardDrive className="h-3.5 w-3.5 text-slate-400" />
            <span>{device.firmware_version || "未知版本"}</span>
          </div>
          <div title={heartbeat.full} className="flex items-start gap-2">
            <Activity
              className={`mt-0.5 h-3.5 w-3.5 ${
                staleHeartbeat ? "text-brand-500" : "text-emerald-500"
              }`}
            />
            <div>
              <p
                className={`text-sm ${
                  device.last_heartbeat ? "text-slate-600" : "text-slate-300"
                }`}
              >
                {heartbeat.text}
              </p>
              <p className="text-xs text-slate-400">
                {getAttentionText(device, staleHeartbeat)}
              </p>
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="pr-6 py-4 text-right">
        {canEdit ? (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </button>
        ) : (
          <span className="text-xs text-slate-300">无可用操作</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function EmptyState({
  hasFilter,
  onClear,
}: {
  hasFilter: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef4ff_100%)] shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)]">
        {hasFilter ? (
          <Search className="h-9 w-9 text-slate-300" />
        ) : (
          <Cpu className="h-9 w-9 text-slate-300" />
        )}
      </div>
      <p className="mt-6 text-lg font-semibold text-slate-900">
        {hasFilter ? "没有找到匹配设备" : "当前还没有设备"}
      </p>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilter
          ? "试试调整搜索条件或切换状态筛选，页面会自动刷新结果。"
          : "注册第一台设备后，这里会展示设备身份、位置、状态和固件信息。"}
      </p>
      {hasFilter && (
        <button
          onClick={onClear}
          className="mt-5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
        >
          清除筛选
        </button>
      )}
    </div>
  );
}

function Pagination({
  current,
  total,
  totalItems,
  pageSize,
  onChange,
}: {
  current: number;
  total: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const pages = generatePages(current, total);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500">
        显示 {from} - {to} 条，共 {formatCount(totalItems)} 条
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, current - 1))}
          disabled={current === 1}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((page, index) =>
          page === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-xs text-slate-400"
            >
              ···
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onChange(page)}
              className={`h-9 min-w-[2.25rem] rounded-xl px-2 text-sm font-medium transition-colors ${
                current === page
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-500/25"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onChange(Math.min(total, current + 1))}
          disabled={current === total}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CreateDeviceDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const createMutation = useCreateDevice();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ id: string; name: string }>({
    defaultValues: { id: "", name: "" },
  });

  useEffect(() => {
    if (open) reset({ id: "", name: "" });
  }, [open, reset]);

  const onSubmit = async (data: { id: string; name: string }) => {
    try {
      await createMutation.mutateAsync({
        id: data.id,
        name: data.name || undefined,
      });
      toast.success("设备创建成功");
      onSuccess();
    } catch {
      toast.error("创建失败，请重试");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-[4px]"
        className="overflow-hidden rounded-[28px] border-0 bg-white p-0 shadow-[0_30px_80px_-25px_rgba(15,23,42,0.35)] ring-0 sm:max-w-md"
      >
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Plus className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-950">
                  注册设备
                </DialogTitle>
                <p className="mt-1 text-sm text-slate-500">
                  创建新设备并准备后续部署绑定。
                </p>
              </div>
            </div>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-slate-700">
              <Icon icon={faXmark} />
            </DialogClose>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5 p-6">
            <div>
              <Label
                htmlFor="device-serial"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                序列号 <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="device-serial"
                {...register("id", {
                  required: "请输入设备序列号",
                  maxLength: {
                    value: 100,
                    message: "序列号不超过100个字符",
                  },
                })}
                placeholder="如：SN-2026-A001"
                className={`h-11 rounded-2xl border px-4 text-sm font-mono shadow-none ${
                  errors.id
                    ? "border-rose-500 ring-2 ring-rose-500/10"
                    : "border-slate-200 bg-slate-50/70 focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-brand-500/10"
                }`}
              />
              {errors.id && (
                <p className="mt-1.5 text-xs text-rose-500">
                  {errors.id.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="device-create-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                设备名称 <span className="font-normal text-slate-400">(选填)</span>
              </Label>
              <Input
                id="device-create-name"
                {...register("name", {
                  maxLength: { value: 50, message: "名称不超过50个字符" },
                })}
                placeholder="如：A区入口闸机"
                className={`h-11 rounded-2xl border px-4 text-sm shadow-none ${
                  errors.name
                    ? "border-rose-500 ring-2 ring-rose-500/10"
                    : "border-slate-200 bg-slate-50/70 focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-brand-500/10"
                }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-rose-500">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary h-10 rounded-xl px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  创建中
                </span>
              ) : (
                "创建设备"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDeviceNameDialog({
  device,
  open,
  onOpenChange,
  onSuccess,
}: {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const updateMutation = useUpdateDeviceName();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ name: string }>({
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (device) reset({ name: device.name || "" });
  }, [device, reset]);

  const onSubmit = async (data: { name: string }) => {
    if (!device) return;
    try {
      await updateMutation.mutateAsync({ id: device.id, data });
      toast.success("设备名称已更新");
      onSuccess();
    } catch {
      toast.error("更新失败，请重试");
    }
  };

  if (!device) return null;

  const cfg = STATUS_CONFIG[device.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-[4px]"
        className="overflow-hidden rounded-[28px] border-0 bg-white p-0 shadow-[0_30px_80px_-25px_rgba(15,23,42,0.35)] ring-0 sm:max-w-md"
      >
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Pencil className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-950">
                  编辑设备名称
                </DialogTitle>
                <p className="mt-1 text-sm text-slate-500">
                  更新页面中的展示名称，不影响设备序列号。
                </p>
              </div>
            </div>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-slate-700">
              <Icon icon={faXmark} />
            </DialogClose>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5 p-6">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${cfg.iconBg}`}
                >
                  <Cpu className={`h-4 w-4 ${cfg.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm text-slate-900">
                    {device.id}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.softBg} ${cfg.textColor}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                      {cfg.label}
                    </span>
                    {device.parking_lot_name && (
                      <span className="text-xs text-slate-400">
                        {device.parking_lot_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label
                htmlFor="device-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                设备名称 <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="device-name"
                {...register("name", {
                  required: "请输入设备名称",
                  maxLength: { value: 50, message: "名称不超过50个字符" },
                })}
                placeholder="如：A区入口闸机"
                className={`h-11 rounded-2xl border px-4 text-sm shadow-none ${
                  errors.name
                    ? "border-rose-500 ring-2 ring-rose-500/10"
                    : "border-slate-200 bg-slate-50/70 focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-brand-500/10"
                }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-rose-500">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn-primary h-10 rounded-xl px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中
                </span>
              ) : (
                "保存"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
