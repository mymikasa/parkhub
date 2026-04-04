"use client";

import { Cpu, Loader2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/Pagination";
import type { Device, DeviceStatus } from "@/lib/device/types";
import { formatCount } from "./constants";
import { BatchActionsBar } from "./BatchActionsBar";
import { DeviceRow } from "./DeviceRow";

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

const STATUS_LABELS: Record<string, string> = {
  all: "全部", active: "在线", offline: "离线", pending: "待分配", disabled: "已禁用",
};

export interface DeviceTableProps {
  devices: Device[];
  isLoading: boolean;
  isOperator: boolean;
  activeStatusFilter: DeviceStatus | "all";
  setActiveStatusFilter: (filter: DeviceStatus | "all") => void;
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  selectedDeviceIds: string[];
  selectedCount: number;
  allSelected: boolean;
  canBatchEnable: boolean;
  canBatchDelete: boolean;
  canBatchBind: boolean;
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectDevice: (deviceId: string, checked: boolean) => void;
  setEditDevice: (device: Device | null) => void;
  setBindDevice: (device: Device | null) => void;
  handleUnbind: (device: Device) => void;
  handleToggleDisabled: (device: Device) => void;
  handleDelete: (device: Device) => void;
  handleBatchDisable: () => void;
  handleBatchEnable: () => void;
  handleBatchDelete: () => void;
  setShowBatchBindDialog: (show: boolean) => void;
  setSelectedDeviceIds: (ids: string[]) => void;
  batchDisableMutationPending: boolean;
  batchEnableMutationPending: boolean;
  batchDeleteMutationPending: boolean;
  batchBindMutationPending: boolean;
  clearFilters: () => void;
  hasFilter: boolean;
}

export function DeviceTable({
  devices, isLoading, isOperator, activeStatusFilter, setActiveStatusFilter,
  total, currentPage, totalPages, pageSize, setCurrentPage,
  selectedDeviceIds, selectedCount, allSelected,
  canBatchEnable, canBatchDelete, canBatchBind,
  toggleSelectAll, toggleSelectDevice,
  setEditDevice, setBindDevice, handleUnbind, handleToggleDisabled, handleDelete,
  handleBatchDisable, handleBatchEnable, handleBatchDelete,
  setShowBatchBindDialog, setSelectedDeviceIds,
  batchDisableMutationPending, batchEnableMutationPending,
  batchDeleteMutationPending, batchBindMutationPending,
  clearFilters, hasFilter,
}: DeviceTableProps) {
  const selectedSet = new Set(selectedDeviceIds);

  return (
    <div className="px-8 pb-8">
      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900">设备列表</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(["all", "active", "offline", "pending", "disabled"] as const).map((value) => (
                <button key={value} onClick={() => setActiveStatusFilter(value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeStatusFilter === value ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {STATUS_LABELS[value]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {formatCount(total)} 条记录</span>
          </div>
        </div>

        {!isOperator && selectedCount > 0 && (
          <BatchActionsBar
            selectedCount={selectedCount} canBatchEnable={canBatchEnable}
            canBatchDelete={canBatchDelete} canBatchBind={canBatchBind}
            onBatchDisable={handleBatchDisable} onBatchEnable={handleBatchEnable}
            onBatchDelete={handleBatchDelete} onBatchBind={() => setShowBatchBindDialog(true)}
            onClearSelection={() => setSelectedDeviceIds([])}
            batchDisablePending={batchDisableMutationPending} batchEnablePending={batchEnableMutationPending}
            batchDeletePending={batchDeleteMutationPending} batchBindPending={batchBindMutationPending}
          />
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand-50 text-brand-600">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="mt-5 text-sm font-medium text-slate-700">正在加载设备数据</p>
            <p className="mt-1 text-sm text-slate-400">正在同步当前筛选条件下的设备状态。</p>
          </div>
        ) : devices.length === 0 ? (
          <EmptyState hasFilter={hasFilter} onClear={clearFilters} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    {!isOperator && (
                      <TableHead className="w-12 pl-6">
                        <Checkbox checked={allSelected}
                          onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                          aria-label="全选当前页设备" />
                      </TableHead>
                    )}
                    <TableHead className="pl-6 text-xs font-medium uppercase tracking-wider text-gray-500">设备信息</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">部署位置</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">运行状态</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-500">固件 / 心跳</TableHead>
                    <TableHead className="pr-6 text-right text-xs font-medium uppercase tracking-wider text-gray-500">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device, index) => (
                    <DeviceRow key={device.id} device={device} canEdit={!isOperator} canControl={true}
                      onEdit={() => setEditDevice(device)} onBind={() => setBindDevice(device)}
                      onUnbind={() => handleUnbind(device)} onToggleDisabled={() => handleToggleDisabled(device)}
                      onDelete={() => handleDelete(device)} selected={selectedSet.has(device.id)}
                      onToggleSelect={(checked) => toggleSelectDevice(device.id, checked)} index={index} />
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <Pagination current={currentPage} total={totalPages} totalItems={total} pageSize={pageSize} onChange={setCurrentPage} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
