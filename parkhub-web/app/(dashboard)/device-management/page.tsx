"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Icon } from "@/components/icons/FontAwesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Cpu,
  Wifi,
  WifiOff,
  Clock,
  Loader2,
  Pencil,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useDevices, useDeviceStats, useCreateDevice, useUpdateDeviceName } from "@/lib/device/hooks";
import { usePermissions } from "@/lib/auth/hooks";
import type { Device, DeviceStatus, DeviceFilter } from "@/lib/device/types";

// Status configuration
const STATUS_CONFIG: Record<
  DeviceStatus,
  { label: string; dotColor: string; bgColor: string; textColor: string }
> = {
  active: {
    label: "在线",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
  },
  offline: {
    label: "离线",
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
  },
  pending: {
    label: "待分配",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
  },
  disabled: {
    label: "已禁用",
    dotColor: "bg-red-500",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
  },
};

function formatHeartbeat(heartbeat: string | null): string {
  if (!heartbeat) return "-";
  const date = new Date(heartbeat);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}天前`;
}

export default function DeviceManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const filter: DeviceFilter = {
    keyword: debouncedSearch,
    status: statusFilter === "all" ? undefined : statusFilter,
    page: currentPage,
    page_size: pageSize,
  };

  const { data, isLoading, refetch } = useDevices(filter);
  const { data: stats, isLoading: isLoadingStats } = useDeviceStats();
  const { isOperator } = usePermissions();
  const devices = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Edit dialog state
  const [editDevice, setEditDevice] = useState<Device | null>(null);

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">设备管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              管理闸机、相机等IoT设备
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Icon
                icon={faMagnifyingGlass}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                type="text"
                placeholder="搜索设备名称或序列号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-72 rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as DeviceStatus | "all")
              }
            >
              <SelectTrigger className="h-10 w-32 rounded-lg border border-gray-200 bg-white text-sm">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">在线</SelectItem>
                <SelectItem value="offline">离线</SelectItem>
                <SelectItem value="pending">待分配</SelectItem>
                <SelectItem value="disabled">已禁用</SelectItem>
              </SelectContent>
            </Select>
            {!isOperator && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                创建设备
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-5 gap-4">
          <StatsCard
            title="设备总数"
            value={stats?.total || 0}
            icon={Cpu}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="在线"
            value={stats?.active || 0}
            icon={Wifi}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="离线"
            value={stats?.offline || 0}
            icon={WifiOff}
            iconBg="bg-gray-100"
            iconColor="text-gray-500"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="待分配"
            value={stats?.pending || 0}
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="已禁用"
            value={stats?.disabled || 0}
            icon={WifiOff}
            iconBg="bg-red-50"
            iconColor="text-red-500"
            isLoading={isLoadingStats}
          />
        </div>
      </div>

      {/* Device Table */}
      <div className="px-8 pb-8">
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">加载中...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Cpu className="h-12 w-12 text-gray-300" />
              <p className="text-gray-500 mt-4">
                {searchQuery || statusFilter !== "all"
                  ? "未找到匹配的设备"
                  : "暂无设备数据"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="pl-6">设备名称</TableHead>
                    <TableHead>序列号</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>所属车场</TableHead>
                    <TableHead>出入口</TableHead>
                    <TableHead>最后心跳</TableHead>
                    <TableHead className="pr-6 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <DeviceRow
                      key={device.id}
                      device={device}
                      canEdit={!isOperator}
                      onEdit={() => setEditDevice(device)}
                    />
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border">
                  <p className="text-sm text-gray-500">
                    共 {total} 条记录，第 {currentPage}/{totalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage === 1}
                      className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Device Dialog */}
      <CreateDeviceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />

      {/* Edit Name Dialog */}
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

// Stats Card
function StatsCard({
  title,
  value,
  icon: IconComponent,
  iconBg,
  iconColor,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  isLoading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-surface-border card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {isLoading ? "..." : value}
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}
        >
          <IconComponent className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// Device Table Row
function DeviceRow({
  device,
  canEdit,
  onEdit,
}: {
  device: Device;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const statusConfig = STATUS_CONFIG[device.status];

  return (
    <TableRow className="hover:bg-gray-50/50">
      <TableCell className="pl-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <span className="font-medium text-gray-900">
            {device.name || "-"}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-500 font-mono">{device.id}</span>
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`}
          />
          {statusConfig.label}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-700">
          {device.parking_lot_name || "-"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-700">
          {device.gate_name || "-"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-500">
          {formatHeartbeat(device.last_heartbeat)}
        </span>
      </TableCell>
      <TableCell className="pr-6 text-right">
        {canEdit && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            <Pencil className="h-3 w-3" />
            编辑
          </button>
        )}
      </TableCell>
    </TableRow>
  );
}

// Create Device Dialog
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
    if (open) {
      reset({ id: "", name: "" });
    }
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
        className="sm:max-w-md rounded-2xl bg-white p-0 gap-0 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0"
      >
        <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            创建设备
          </DialogTitle>
          <DialogClose className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <Icon icon={faXmark} />
          </DialogClose>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-5">
            <div>
              <Label
                htmlFor="device-serial"
                className="text-sm font-medium text-gray-700 mb-1.5 block"
              >
                序列号 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="device-serial"
                {...register("id", {
                  required: "请输入设备序列号",
                  maxLength: { value: 100, message: "序列号不超过100个字符" },
                })}
                placeholder="如：SN-2026-A001"
                className={`h-11 px-4 rounded-lg border-gray-200 text-sm font-mono ${errors.id ? "border-red-500" : ""}`}
              />
              {errors.id && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.id.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="device-create-name"
                className="text-sm font-medium text-gray-700 mb-1.5 block"
              >
                设备名称 <span className="text-gray-400 font-normal">(选填)</span>
              </Label>
              <Input
                id="device-create-name"
                {...register("name", {
                  maxLength: { value: 50, message: "名称不超过50个字符" },
                })}
                placeholder="如：A区入口闸机"
                className={`h-11 px-4 rounded-lg border-gray-200 text-sm ${errors.name ? "border-red-500" : ""}`}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  创建中...
                </span>
              ) : (
                "创建"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Device Name Dialog
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
    if (device) {
      reset({ name: device.name || "" });
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-[4px]"
        className="sm:max-w-md rounded-2xl bg-white p-0 gap-0 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0"
      >
        <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            编辑设备名称
          </DialogTitle>
          <DialogClose className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <Icon icon={faXmark} />
          </DialogClose>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Cpu className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  序列号: {device.id}
                </p>
                <p className="text-xs text-gray-500">
                  {STATUS_CONFIG[device.status].label}
                </p>
              </div>
            </div>
            <div>
              <Label
                htmlFor="device-name"
                className="text-sm font-medium text-gray-700 mb-1.5 block"
              >
                设备名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="device-name"
                {...register("name", {
                  required: "请输入设备名称",
                  maxLength: { value: 50, message: "名称不超过50个字符" },
                })}
                placeholder="如：A区入口闸机"
                className={`h-11 px-4 rounded-lg border-gray-200 text-sm ${errors.name ? "border-red-500" : ""}`}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
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
