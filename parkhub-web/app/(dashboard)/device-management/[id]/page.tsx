"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Loader2,
  ShieldOff,
  ToggleLeft,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import {
  useDevice,
  useDeviceControlLogs,
  useDisableDevice,
  useEnableDevice,
  useUnbindDevice,
} from "@/lib/device/hooks";
import { getRuntimeDeviceStatus } from "@/lib/device/status";
import type { DeviceStatus } from "@/lib/device/types";
import { useGates, useParkingLot } from "@/lib/parking-lot/hooks";
import { usePermissions } from "@/lib/auth/hooks";
import { DeviceControlButton } from "@/components/device";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<DeviceStatus, string> = {
  active: "在线",
  offline: "离线",
  pending: "待分配",
  disabled: "已禁用",
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function toCommandLabel(command: string): string {
  if (command === "open_gate") return "抬杆";
  return command || "-";
}

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const deviceID = Array.isArray(params.id) ? params.id[0] : params.id;
  const [page, setPage] = useState(1);

  const { isOperator } = usePermissions();
  const { data: device, isLoading, error, refetch } = useDevice(deviceID || "");
  const {
    data: logs,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useDeviceControlLogs(deviceID || "", page, PAGE_SIZE);
  const { data: parkingLot } = useParkingLot(device?.parking_lot_id ?? "");
  const { data: gates = [] } = useGates(device?.parking_lot_id ?? "");

  const disableMutation = useDisableDevice();
  const enableMutation = useEnableDevice();
  const unbindMutation = useUnbindDevice();

  const gateName = useMemo(() => {
    if (!device?.gate_id) return "未绑定";
    const target = gates.find((item) => item.id === device.gate_id);
    return target?.name || device.gate_id;
  }, [device?.gate_id, gates]);

  if (!deviceID) {
    return <div className="p-6 text-sm text-rose-600">设备 ID 无效</div>;
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="p-6">
        <Link
          href="/device-management"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回设备列表
        </Link>
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error instanceof Error ? error.message : "设备不存在或无权限访问"}
        </div>
      </div>
    );
  }

  const runtimeStatus = getRuntimeDeviceStatus(device.status, device.last_heartbeat);
  const isBound = !!device.parking_lot_id;
  const canEditAdminActions = !isOperator;
  const isStatusLoading = disableMutation.isPending || enableMutation.isPending;
  const isUnbindLoading = unbindMutation.isPending;

  const totalLogs = logs?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));
  const logItems = logs?.items ?? [];

  const handleToggleStatus = async () => {
    if (!canEditAdminActions) return;
    const action = device.status === "disabled" ? "启用" : "禁用";
    if (!window.confirm(`确认${action}设备 ${device.name || device.id} 吗？`)) return;

    try {
      if (device.status === "disabled") {
        await enableMutation.mutateAsync(device.id);
        toast.success("设备已启用");
      } else {
        await disableMutation.mutateAsync(device.id);
        toast.success("设备已禁用");
      }
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${action}失败，请重试`);
    }
  };

  const handleUnbind = async () => {
    if (!isBound || !canEditAdminActions) return;
    if (!window.confirm(`确认解绑设备 ${device.name || device.id} 吗？`)) return;

    try {
      await unbindMutation.mutateAsync(device.id);
      toast.success("设备解绑成功");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "解绑失败，请重试");
    }
  };

  return (
    <div className="px-4 py-5 md:px-8 md:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/device-management"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            返回设备列表
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">设备详情</h1>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          当前状态：{STATUS_LABEL[runtimeStatus]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">基础信息</h2>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-slate-400">设备名称</p>
                <p className="mt-1 text-slate-800">{device.name || "未命名设备"}</p>
              </div>
              <div>
                <p className="text-slate-400">设备序列号</p>
                <p className="mt-1 font-mono text-slate-800">{device.id}</p>
              </div>
              <div>
                <p className="text-slate-400">运行状态</p>
                <p className="mt-1 text-slate-800">{STATUS_LABEL[runtimeStatus]}</p>
              </div>
              <div>
                <p className="text-slate-400">固件版本</p>
                <p className="mt-1 text-slate-800">{device.firmware_version || "未知版本"}</p>
              </div>
              <div>
                <p className="text-slate-400">最后心跳</p>
                <p className="mt-1 text-slate-800">{formatDateTime(device.last_heartbeat)}</p>
              </div>
              <div>
                <p className="text-slate-400">创建时间</p>
                <p className="mt-1 text-slate-800">{formatDateTime(device.created_at)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">位置信息</h2>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-slate-400">所属车场</p>
                <p className="mt-1 text-slate-800">
                  {parkingLot?.name || device.parking_lot_id || "未绑定"}
                </p>
              </div>
              <div>
                <p className="text-slate-400">所属出入口</p>
                <p className="mt-1 text-slate-800">{gateName}</p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">控制操作</h2>
          <div className="flex flex-wrap gap-2">
            <DeviceControlButton
              deviceId={device.id}
              deviceName={device.name || device.id}
              status={device.status}
              lastHeartbeat={device.last_heartbeat}
              onSuccess={() => {
                refetchLogs();
              }}
            />
            <button
              onClick={handleToggleStatus}
              disabled={isStatusLoading || !canEditAdminActions}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ToggleLeft className="h-3.5 w-3.5" />
              {device.status === "disabled" ? "启用设备" : "禁用设备"}
            </button>
            {isBound && (
              <button
                onClick={handleUnbind}
                disabled={isUnbindLoading || !canEditAdminActions}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DoorOpen className="h-3.5 w-3.5" />
                解绑设备
              </button>
            )}
          </div>
          {isOperator && (
            <p className="mt-3 text-xs text-slate-400">
              当前角色为操作员，仅可执行抬杆操作。
            </p>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">控制日志</h2>
          <span className="text-xs text-slate-400">每页 {PAGE_SIZE} 条</span>
        </div>

        {logsLoading ? (
          <div className="flex h-28 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : logItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            暂无控制日志
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>操作人</TableHead>
                    <TableHead>指令</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm text-slate-700">
                        <div className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                          {formatDateTime(item.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        <div className="inline-flex items-center gap-1">
                          <UserCircle2 className="h-3.5 w-3.5 text-slate-400" />
                          {item.operator_name || item.operator_id}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        <div className="inline-flex items-center gap-1">
                          <ShieldOff className="h-3.5 w-3.5 text-slate-400" />
                          {toCommandLabel(item.command)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {logItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-800">{toCommandLabel(item.command)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    操作人：{item.operator_name || item.operator_id}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            上一页
          </button>
          <span className="text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一页
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
}
