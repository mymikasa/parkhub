"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useBatchBindDevices,
  useBatchDeleteDevices,
  useBatchDisableDevices,
  useBatchEnableDevices,
  useDeleteDevice,
  useDevices,
  useDeviceStats,
  useDisableDevice,
  useEnableDevice,
  useUnbindDevice,
} from "@/lib/device/hooks";
import { usePermissions } from "@/lib/auth/hooks";
import { getRuntimeDeviceStatus } from "@/lib/device/status";
import type { Device, DeviceFilter, DeviceStatus } from "@/lib/device/types";
import { formatPercent } from "./constants";

const PAGE_SIZE = 20;

export function useDeviceManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState<DeviceStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [bindDevice, setBindDevice] = useState<Device | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [showBatchBindDialog, setShowBatchBindDialog] = useState(false);

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
    page_size: PAGE_SIZE,
  };

  const { data, isLoading, isFetching, refetch } = useDevices(filter);
  const { data: stats, isLoading: isLoadingStats } = useDeviceStats();
  const { isOperator } = usePermissions();
  const unbindMutation = useUnbindDevice();
  const disableMutation = useDisableDevice();
  const enableMutation = useEnableDevice();
  const deleteMutation = useDeleteDevice();
  const batchDisableMutation = useBatchDisableDevices();
  const batchEnableMutation = useBatchEnableDevices();
  const batchDeleteMutation = useBatchDeleteDevices();
  const batchBindMutation = useBatchBindDevices();

  const devices = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const totalDevices = stats?.total || 0;
  const onlineDevices = stats?.online || 0;
  const offlineDevices = stats?.offline || 0;
  const pendingDevices = stats?.pending || 0;
  const disabledDevices = stats?.disabled || 0;
  const onlineRate = formatPercent(onlineDevices, totalDevices);

  const selectedSet = new Set(selectedDeviceIds);
  const selectedDevices = devices.filter((device) => selectedSet.has(device.id));
  const selectedCount = selectedDevices.length;
  const allSelected = selectedCount > 0 && selectedCount === devices.length;
  const canBatchEnable = selectedCount > 0 && selectedDevices.every((d) => d.status === "disabled");
  const canBatchDelete = selectedCount > 0 && selectedDevices.every((d) => !d.parking_lot_id);
  const canBatchBind =
    selectedCount > 0 &&
    selectedDevices.every((d) => d.status === "pending" || d.status === "active");

  const heartbeatTimedOutCount = devices.filter(
    (device) =>
      device.status === "active" &&
      getRuntimeDeviceStatus(device.status, device.last_heartbeat) === "offline"
  ).length;
  const hasAttention = offlineDevices > 0 || pendingDevices > 0 || heartbeatTimedOutCount > 0;

  useEffect(() => {
    setSelectedDeviceIds([]);
  }, [currentPage, activeStatusFilter, debouncedSearch]);

  useEffect(() => {
    if (!devices.length) {
      setSelectedDeviceIds([]);
      return;
    }
    setSelectedDeviceIds((prev) => prev.filter((id) => devices.some((d) => d.id === id)));
  }, [devices]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDeviceIds(devices.map((device) => device.id));
      return;
    }
    setSelectedDeviceIds([]);
  };

  const toggleSelectDevice = (deviceID: string, checked: boolean) => {
    setSelectedDeviceIds((prev) => {
      if (checked) {
        if (prev.includes(deviceID)) return prev;
        return [...prev, deviceID];
      }
      return prev.filter((id) => id !== deviceID);
    });
  };

  const handleUnbind = async (device: Device) => {
    if (!device.parking_lot_id) return;
    if (!window.confirm(`确认解绑设备 ${device.name || device.id} 吗？`)) return;
    try {
      await unbindMutation.mutateAsync(device.id);
      toast.success("设备解绑成功");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "解绑失败，请重试");
    }
  };

  const handleToggleDisabled = async (device: Device) => {
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
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${action}失败，请重试`);
    }
  };

  const handleDelete = async (device: Device) => {
    if (device.parking_lot_id) return;
    if (!window.confirm(`确认删除设备 ${device.name || device.id} 吗？此操作不可恢复。`)) return;
    try {
      await deleteMutation.mutateAsync(device.id);
      toast.success("设备已删除");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败，请重试");
    }
  };

  const handleBatchDisable = async () => {
    if (!selectedCount) return;
    if (!window.confirm(`确认批量禁用 ${selectedCount} 台设备吗？`)) return;
    try {
      await batchDisableMutation.mutateAsync(selectedDeviceIds);
      toast.success("设备已批量禁用");
      setSelectedDeviceIds([]);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "批量禁用失败，请重试");
    }
  };

  const handleBatchEnable = async () => {
    if (!selectedCount) return;
    if (!window.confirm(`确认批量启用 ${selectedCount} 台设备吗？`)) return;
    try {
      await batchEnableMutation.mutateAsync(selectedDeviceIds);
      toast.success("设备已批量启用");
      setSelectedDeviceIds([]);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "批量启用失败，请重试");
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedCount) return;
    if (!window.confirm(`确认批量删除 ${selectedCount} 台设备吗？此操作不可恢复。`)) return;
    try {
      await batchDeleteMutation.mutateAsync(selectedDeviceIds);
      toast.success("设备已批量删除");
      setSelectedDeviceIds([]);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "批量删除失败，请重试");
    }
  };

  return {
    // Search
    searchQuery,
    setSearchQuery,
    isFetching,
    refetch,
    // Filters
    activeStatusFilter,
    setActiveStatusFilter,
    // Pagination
    currentPage,
    setCurrentPage,
    pageSize: PAGE_SIZE,
    // Stats
    totalDevices,
    onlineDevices,
    offlineDevices,
    pendingDevices,
    disabledDevices,
    total,
    totalPages,
    onlineRate,
    isLoadingStats,
    heartbeatTimedOutCount,
    hasAttention,
    // Devices
    devices,
    isLoading,
    isOperator,
    // Selection
    selectedDeviceIds,
    selectedDevices,
    selectedCount,
    allSelected,
    canBatchEnable,
    canBatchDelete,
    canBatchBind,
    toggleSelectAll,
    toggleSelectDevice,
    // Dialogs
    showCreateDialog,
    setShowCreateDialog,
    editDevice,
    setEditDevice,
    bindDevice,
    setBindDevice,
    showBatchBindDialog,
    setShowBatchBindDialog,
    // Handlers
    handleUnbind,
    handleToggleDisabled,
    handleDelete,
    handleBatchDisable,
    handleBatchEnable,
    handleBatchDelete,
    // Mutations
    batchDisableMutationPending: batchDisableMutation.isPending,
    batchEnableMutationPending: batchEnableMutation.isPending,
    batchDeleteMutationPending: batchDeleteMutation.isPending,
    batchBindMutation,
  };
}
