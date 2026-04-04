"use client";

import Link from "next/link";
import {
  Activity,
  CircleAlert,
  DoorOpen,
  HardDrive,
  MapPin,
  Pencil,
  Power,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { getRuntimeDeviceStatus } from "@/lib/device/status";
import type { Device } from "@/lib/device/types";
import { DeviceControlButton } from "@/components/device";
import {
  STATUS_CONFIG,
  HEARTBEAT_TIMEOUT_MINUTES,
  formatHeartbeat,
  getAttentionText,
} from "./constants";

export function DeviceRow({
  device,
  canEdit,
  canControl,
  onEdit,
  onBind,
  onUnbind,
  onToggleDisabled,
  onDelete,
  selected,
  onToggleSelect,
  index,
}: {
  device: Device;
  canEdit: boolean;
  canControl: boolean;
  onEdit: () => void;
  onBind: () => void;
  onUnbind: () => void;
  onToggleDisabled: () => void;
  onDelete: () => void;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  index: number;
}) {
  const runtimeStatus = getRuntimeDeviceStatus(device.status, device.last_heartbeat);
  const cfg = STATUS_CONFIG[runtimeStatus];
  const heartbeat = formatHeartbeat(device.last_heartbeat);
  const StatusIcon = cfg.icon;
  const heartbeatTimedOut = device.status === "active" && runtimeStatus === "offline";
  const canBind = canEdit && (device.status === "pending" || device.status === "active");
  const isBound = !!device.parking_lot_id;
  const canDelete = !isBound;
  const canEnable = device.status === "disabled";

  return (
    <TableRow
      className={`border-b border-slate-100/90 transition-colors ${cfg.rowTint}`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {canEdit && (
        <TableCell className="w-12 pl-6 py-4">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onToggleSelect(checked === true)}
            aria-label={`选择设备 ${device.id}`}
          />
        </TableCell>
      )}
      <TableCell className={`${canEdit ? "" : "pl-6"} py-4`}>
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
              {heartbeatTimedOut && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                  心跳超时
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
              {runtimeStatus === "active" && (
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
            {heartbeatTimedOut ? `心跳超时超过 ${HEARTBEAT_TIMEOUT_MINUTES} 分钟` : cfg.note}
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
                heartbeatTimedOut ? "text-rose-500" : "text-emerald-500"
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
                {getAttentionText(runtimeStatus)}
              </p>
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="pr-6 py-4 text-right">
        {canEdit ? (
          <div className="flex justify-end gap-2">
            <Link
              href={`/device-management/${device.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              <HardDrive className="h-3.5 w-3.5" />
              详情
            </Link>
            {canControl && (
              <DeviceControlButton
                deviceId={device.id}
                deviceName={device.name || device.id}
                status={device.status}
                lastHeartbeat={device.last_heartbeat}
              />
            )}
            <button
              onClick={onToggleDisabled}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                canEnable
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              {canEnable ? (
                <Power className="h-3.5 w-3.5" />
              ) : (
                <ShieldOff className="h-3.5 w-3.5" />
              )}
              {canEnable ? "启用" : "禁用"}
            </button>
            <button
              onClick={onBind}
              disabled={!canBind}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                canBind
                  ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                  : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {isBound ? "改绑" : "绑定"}
            </button>
            {isBound && (
              <button
                onClick={onUnbind}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
              >
                <X className="h-3.5 w-3.5" />
                解绑
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
            )}
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              编辑
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Link
              href={`/device-management/${device.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              <HardDrive className="h-3.5 w-3.5" />
              详情
            </Link>
            {canControl && (
              <DeviceControlButton
                deviceId={device.id}
                deviceName={device.name || device.id}
                status={device.status}
                lastHeartbeat={device.last_heartbeat}
              />
            )}
            {!canControl && <span className="text-xs text-slate-300">无可用操作</span>}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
