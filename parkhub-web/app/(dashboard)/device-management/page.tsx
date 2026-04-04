"use client";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, RefreshCw, Search, X } from "lucide-react";
import { DeviceStatsCards } from "./_components/DeviceStatsCards";
import { DeviceTable } from "./_components/DeviceTable";
import { CreateDeviceDialog } from "./_components/CreateDeviceDialog";
import { EditDeviceNameDialog } from "./_components/EditDeviceNameDialog";
import { BindDeviceDialog } from "./_components/BindDeviceDialog";
import { BatchBindDeviceDialog } from "./_components/BatchBindDeviceDialog";
import { useDeviceManagement } from "./_components/useDeviceManagement";

export default function DeviceManagementPage() {
  const vm = useDeviceManagement();

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
                value={vm.searchQuery}
                onChange={(e) => vm.setSearchQuery(e.target.value)}
                className="w-64 h-10 pl-10 pr-10 rounded-lg border-gray-200 text-sm"
              />
              {vm.searchQuery && (
                <button
                  onClick={() => vm.setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => vm.refetch()}
              disabled={vm.isFetching}
              className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {vm.isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              刷新
            </button>
            {!vm.isOperator && (
              <button
                onClick={() => vm.setShowCreateDialog(true)}
                className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                注册设备
              </button>
            )}
          </div>
        </div>
      </header>

      <DeviceStatsCards
        totalDevices={vm.totalDevices}
        onlineDevices={vm.onlineDevices}
        offlineDevices={vm.offlineDevices}
        pendingDevices={vm.pendingDevices}
        disabledDevices={vm.disabledDevices}
        total={vm.total}
        onlineRate={vm.onlineRate}
        isLoadingStats={vm.isLoadingStats}
        activeStatusFilter={vm.activeStatusFilter}
        setActiveStatusFilter={vm.setActiveStatusFilter}
        heartbeatTimedOutCount={vm.heartbeatTimedOutCount}
        hasAttention={vm.hasAttention}
      />

      <DeviceTable
        devices={vm.devices}
        isLoading={vm.isLoading}
        isOperator={vm.isOperator}
        activeStatusFilter={vm.activeStatusFilter}
        setActiveStatusFilter={vm.setActiveStatusFilter}
        total={vm.total}
        currentPage={vm.currentPage}
        totalPages={vm.totalPages}
        pageSize={vm.pageSize}
        setCurrentPage={vm.setCurrentPage}
        selectedDeviceIds={vm.selectedDeviceIds}
        selectedCount={vm.selectedCount}
        allSelected={vm.allSelected}
        canBatchEnable={vm.canBatchEnable}
        canBatchDelete={vm.canBatchDelete}
        canBatchBind={vm.canBatchBind}
        toggleSelectAll={vm.toggleSelectAll}
        toggleSelectDevice={vm.toggleSelectDevice}
        setEditDevice={vm.setEditDevice}
        setBindDevice={vm.setBindDevice}
        handleUnbind={vm.handleUnbind}
        handleToggleDisabled={vm.handleToggleDisabled}
        handleDelete={vm.handleDelete}
        handleBatchDisable={vm.handleBatchDisable}
        handleBatchEnable={vm.handleBatchEnable}
        handleBatchDelete={vm.handleBatchDelete}
        setShowBatchBindDialog={vm.setShowBatchBindDialog}
        setSelectedDeviceIds={vm.setSelectedDeviceIds}
        batchDisableMutationPending={vm.batchDisableMutationPending}
        batchEnableMutationPending={vm.batchEnableMutationPending}
        batchDeleteMutationPending={vm.batchDeleteMutationPending}
        batchBindMutationPending={vm.batchBindMutation.isPending}
        clearFilters={() => {
          vm.setSearchQuery("");
          vm.setActiveStatusFilter("all");
        }}
        hasFilter={!!vm.searchQuery || vm.activeStatusFilter !== "all"}
      />

      <CreateDeviceDialog
        open={vm.showCreateDialog}
        onOpenChange={vm.setShowCreateDialog}
        onSuccess={() => {
          vm.setShowCreateDialog(false);
          vm.refetch();
        }}
      />
      <EditDeviceNameDialog
        device={vm.editDevice}
        open={!!vm.editDevice}
        onOpenChange={(open) => {
          if (!open) vm.setEditDevice(null);
        }}
        onSuccess={() => {
          vm.setEditDevice(null);
          vm.refetch();
        }}
      />
      <BindDeviceDialog
        device={vm.bindDevice}
        open={!!vm.bindDevice}
        onOpenChange={(open) => {
          if (!open) vm.setBindDevice(null);
        }}
        onSuccess={() => {
          vm.setBindDevice(null);
          vm.refetch();
        }}
      />
      <BatchBindDeviceDialog
        open={vm.showBatchBindDialog}
        onOpenChange={vm.setShowBatchBindDialog}
        selectedDevices={vm.selectedDevices}
        onSubmit={async (data) => {
          await vm.batchBindMutation.mutateAsync({
            ids: vm.selectedDeviceIds,
            ...data,
          });
          vm.setSelectedDeviceIds([]);
          vm.setShowBatchBindDialog(false);
          toast.success("设备已批量绑定");
          vm.refetch();
        }}
      />
    </>
  );
}
