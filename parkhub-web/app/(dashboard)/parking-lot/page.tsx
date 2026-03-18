'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Icon } from '@/components/icons/FontAwesome';
import { faMagnifyingGlass, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Building2,
  Car,
  DoorOpen,
  MapPin,
  ParkingCircle,
  Loader2,
  ArrowRightToLine,
  ArrowRightFromLine,
} from "lucide-react";
import { useParkingLots, useParkingLotStats, useCreateParkingLot, useUpdateParkingLot } from '@/lib/parking-lot/hooks';
import type { ParkingLot, ParkingLotStatus, LotType } from '@/lib/parking-lot/types';
import { GateConfigDialog } from '@/components/parking-lot/gate-config-dialog';

// Form types
interface CreateFormData {
  name: string;
  address: string;
  total_spaces: number;
  lot_type: 'underground' | 'ground' | 'stereo';
}

interface UpdateFormData {
  name: string;
  address: string;
  total_spaces: number;
  lot_type: 'underground' | 'ground' | 'stereo';
  status: 'active' | 'inactive';
}

// Icon gradients for parking lot cards
const LOT_ICON_GRADIENTS = [
  { icon: Building2, gradient: 'from-blue-500 to-blue-600' },
  { icon: Car, gradient: 'from-emerald-500 to-emerald-600' },
  { icon: ParkingCircle, gradient: 'from-violet-500 to-violet-600' },
  { icon: MapPin, gradient: 'from-amber-500 to-amber-600' },
];

function getLotIcon(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOT_ICON_GRADIENTS[Math.abs(hash) % LOT_ICON_GRADIENTS.length];
}

// Format number with thousand separator
function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

// Get usage rate color and glow
function getUsageRateStyles(rate: number, status: ParkingLotStatus): { color: string; glow: string } {
  if (status === 'inactive') {
    return { color: 'bg-gray-300', glow: '' };
  }
  if (rate >= 90) return { color: 'bg-red-500', glow: 'glow-danger' };
  if (rate >= 80) return { color: 'bg-amber-500', glow: 'glow-warning' };
  return { color: 'bg-emerald-500', glow: 'glow-normal' };
}

function getUsageRateTextColor(rate: number, status: ParkingLotStatus): string {
  if (status === 'inactive') {
    return 'text-gray-500';
  }
  if (rate >= 90) return 'text-red-600';
  if (rate >= 80) return 'text-gray-900';
  return 'text-emerald-600';
}

function getLotTypeLabel(lotType: LotType): string {
  switch (lotType) {
    case 'ground':
      return '地面停车场';
    case 'stereo':
      return '立体车库';
    default:
      return '地下停车场';
  }
}

export default function ParkingLotPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: lotsData, isLoading: isLoadingLots, refetch } = useParkingLots({
    search: debouncedSearch,
  });
  const { data: stats, isLoading: isLoadingStats } = useParkingLotStats();

  const lots = lotsData?.items || [];

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGateConfigDialogOpen, setIsGateConfigDialogOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);

  return (
    <>
      {/* Header - sticky white bar */}
      <header className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">停车场管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">管理旗下所有停车场及出入口配置</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Icon
                icon={faMagnifyingGlass}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                type="text"
                placeholder="搜索车场..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-64 rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/10"
              />
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-2"
            >
              <Icon icon={faPlus} size="sm" />
              新建车场
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-5">
          <StatsCard
            title="总车位数"
            value={stats?.total_spaces || 0}
            icon={ParkingCircle}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            valueColor="text-gray-900"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="剩余车位"
            value={stats?.available_spaces || 0}
            icon={Car}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            valueColor="text-emerald-600"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="在场车辆"
            value={stats?.occupied_vehicles || 0}
            icon={Car}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            valueColor="text-gray-900"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="出入口数"
            value={stats?.total_gates || 0}
            icon={DoorOpen}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            valueColor="text-gray-900"
            isLoading={isLoadingStats}
          />
        </div>
      </div>

      {/* Parking Lot Cards */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-2 gap-5">
          {isLoadingLots ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-border p-6 animate-pulse">
                <div className="h-40 bg-gray-200 rounded"></div>
              </div>
            ))
          ) : lots.length === 0 ? (
            <div className="col-span-2 bg-white rounded-xl border border-surface-border p-12 text-center">
              <ParkingCircle className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-gray-500 mt-4">
                {searchQuery ? '未找到匹配的停车场' : '暂无停车场数据'}
              </p>
            </div>
          ) : (
            lots.map((lot) => (
              <ParkingLotCard
                key={lot.id}
                lot={lot}
                onEdit={() => {
                  setSelectedLot(lot);
                  setIsEditDialogOpen(true);
                }}
                onConfig={() => {
                  setSelectedLot(lot);
                  setIsGateConfigDialogOpen(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <CreateParkingLotDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          refetch();
        }}
      />

      {/* Edit Dialog */}
      <EditParkingLotDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        lot={selectedLot}
        onSuccess={() => {
          setIsEditDialogOpen(false);
          setSelectedLot(null);
          refetch();
        }}
      />

      {/* Gate Config Dialog */}
      {selectedLot && (
        <GateConfigDialog
          open={isGateConfigDialogOpen}
          onOpenChange={(open) => {
            setIsGateConfigDialogOpen(open);
            if (!open) setSelectedLot(null);
          }}
          parkingLotId={selectedLot.id}
          parkingLotName={selectedLot.name}
        />
      )}
    </>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  isLoading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold ${valueColor} mt-1`}>
            {isLoading ? '...' : formatNumber(value)}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// Parking Lot Card Component
function ParkingLotCard({
  lot,
  onEdit,
  onConfig,
}: {
  lot: ParkingLot;
  onEdit: () => void;
  onConfig: () => void;
}) {
  const { icon: Icon, gradient } = getLotIcon(lot.name);
  const usageRate = lot.usage_rate;
  const { color: usageColor, glow: usageGlow } = getUsageRateStyles(usageRate, lot.status);
  const textColor = getUsageRateTextColor(usageRate, lot.status);

  return (
    <div className="bg-white rounded-xl border border-surface-border overflow-hidden card-hover">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">{lot.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                <MapPin className="h-3 w-3 text-gray-400 mr-1 inline" />
                {lot.address}
              </p>
            </div>
          </div>
          <StatusBadge status={lot.status} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{formatNumber(lot.total_spaces)}</div>
            <div className="text-xs text-gray-500 mt-1">总车位</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{formatNumber(lot.available_spaces)}</div>
            <div className="text-xs text-gray-500 mt-1">剩余</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-brand-600">{lot.entry_count + lot.exit_count}</div>
            <div className="text-xs text-gray-500 mt-1">出入口</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500">使用率</span>
            <span className={`font-medium ${textColor}`}>
              {usageRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full progress-bar ${usageGlow} ${usageColor}`}
              style={{ width: `${Math.min(usageRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            <ArrowRightToLine className="h-3 w-3 text-emerald-500 mr-1 inline" />
            入口 {lot.entry_count}
          </span>
          <span>
            <ArrowRightFromLine className="h-3 w-3 text-blue-500 mr-1 inline" />
            出口 {lot.exit_count}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onConfig} className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
            配置出入口
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={onEdit} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: ParkingLotStatus }) {
  const isActive = status === 'active';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      isActive ? 'bg-emerald-50 text-emerald-700 glow-normal' : 'bg-gray-100 text-gray-600'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        isActive ? 'bg-emerald-500 status-dot' : 'bg-gray-400'
      }`} />
      {isActive ? '运营中' : '暂停运营'}
    </span>
  );
}

// Create Dialog Component
function CreateParkingLotDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const createMutation = useCreateParkingLot();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateFormData>({
    defaultValues: {
      name: '',
      address: '',
      total_spaces: 0,
      lot_type: 'underground',
    },
  });

  const lotType = watch('lot_type');

  useEffect(() => {
    if (open) {
      reset({
        name: '',
        address: '',
        total_spaces: 0,
        lot_type: 'underground',
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateFormData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('车场创建成功');
      onSuccess();
    } catch {
      toast.error('创建失败，请重试');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-[4px]"
        className="sm:max-w-lg rounded-2xl bg-white p-0 gap-0 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0"
      >
        <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-gray-900">新建停车场</DialogTitle>
          <DialogClose className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <Icon icon={faXmark} />
          </DialogClose>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-5">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1.5 block">车场名称 <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                {...register('name', { required: '请输入车场名称' })}
                placeholder="如：万科翡翠滨江地下停车场"
                className={`h-11 px-4 rounded-lg border-gray-200 text-sm ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="address" className="text-sm font-medium text-gray-700 mb-1.5 block">车场地址 <span className="text-red-500">*</span></Label>
              <Input
                id="address"
                {...register('address', { required: '请输入车场地址' })}
                placeholder="省/市/区/街道/门牌号"
                className={`h-11 px-4 rounded-lg border-gray-200 text-sm ${errors.address ? 'border-red-500' : ''}`}
              />
              {errors.address && (
                <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_spaces" className="text-sm font-medium text-gray-700 mb-1.5 block">总车位数 <span className="text-red-500">*</span></Label>
                <Input
                  id="total_spaces"
                  type="number"
                  {...register('total_spaces', { valueAsNumber: true, min: { value: 1, message: '车位数至少为1' } })}
                  placeholder="0"
                  className={`h-11 px-4 rounded-lg border-gray-200 text-sm ${errors.total_spaces ? 'border-red-500' : ''}`}
                />
                {errors.total_spaces && (
                  <p className="text-sm text-red-500 mt-1">{errors.total_spaces.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lot_type" className="text-sm font-medium text-gray-700 mb-1.5 block">车场类型</Label>
                <Select
                  value={lotType}
                  onValueChange={(v) => setValue('lot_type', v as LotType)}
                >
                  <SelectTrigger className="h-11 px-4 rounded-lg border-gray-200 text-sm">
                    <SelectValue placeholder="选择车场类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="underground">地下停车场</SelectItem>
                    <SelectItem value="ground">地面停车场</SelectItem>
                    <SelectItem value="stereo">立体车库</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
            <button type="button" onClick={() => onOpenChange(false)} className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium disabled:opacity-50">
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  创建中...
                </span>
              ) : (
                '确认创建'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Dialog Component
function EditParkingLotDialog({
  open,
  onOpenChange,
  lot,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: ParkingLot | null;
  onSuccess: () => void;
}) {
  const updateMutation = useUpdateParkingLot();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateFormData>({
    defaultValues: {
      name: '',
      address: '',
      total_spaces: 0,
      lot_type: 'underground',
      status: 'active',
    },
  });

  const lotType = watch('lot_type');
  const status = watch('status');
  const currentTotalSpaces = watch('total_spaces');

  useEffect(() => {
    if (lot) {
      reset({
        name: lot.name,
        address: lot.address,
        total_spaces: lot.total_spaces,
        lot_type: lot.lot_type,
        status: lot.status,
      });
    }
  }, [lot, reset]);

  const onSubmit = async (data: UpdateFormData) => {
    if (!lot) return;
    try {
      await updateMutation.mutateAsync({ id: lot.id, data });
      toast.success('修改已保存');
      onSuccess();
    } catch {
      toast.error('保存失败，请重试');
    }
  };

  if (!lot) return null;

  const { icon: LotIcon, gradient } = getLotIcon(lot.name);
  const usageStyles = getUsageRateStyles(lot.usage_rate, lot.status);
  const usageTextColor = getUsageRateTextColor(lot.usage_rate, lot.status);
  const currentStatus = status === 'active' ? '运营中' : '暂停运营';
  const currentLotTypeLabel = getLotTypeLabel(lotType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-[4px]"
        className="sm:max-w-2xl rounded-2xl bg-white p-0 gap-0 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0"
      >
        <div className="px-6 py-5 border-b border-surface-border flex items-start justify-between">
          <div>
            <DialogTitle className="text-lg font-semibold text-gray-900">编辑停车场</DialogTitle>
            <p className="mt-1 text-sm text-gray-500">更新基础资料与运营状态，修改会立即同步到当前车场列表。</p>
          </div>
          <DialogClose className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <Icon icon={faXmark} />
          </DialogClose>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_55%,#eef6ff_100%)] p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg shadow-blue-500/15`}>
                    <LotIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{lot.name}</h3>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
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

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5 rounded-2xl border border-surface-border bg-white p-5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">基础信息</p>
                  <p className="mt-1 text-xs text-gray-500">编辑后的名称、地址与容量会同步影响运营列表、搜索与概览展示。</p>
                </div>
                <div>
                  <Label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium text-gray-700">车场名称 <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-name"
                    {...register('name', { required: '请输入车场名称' })}
                    className={`h-11 rounded-xl border px-4 text-sm shadow-none ${errors.name ? 'border-red-500 focus-visible:ring-red-500/10' : 'border-gray-200 bg-gray-50/60 hover:bg-white focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-brand-500/10'}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-address" className="mb-1.5 block text-sm font-medium text-gray-700">车场地址 <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-address"
                    {...register('address', { required: '请输入车场地址' })}
                    className={`h-11 rounded-xl border px-4 text-sm shadow-none ${errors.address ? 'border-red-500 focus-visible:ring-red-500/10' : 'border-gray-200 bg-gray-50/60 hover:bg-white focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-brand-500/10'}`}
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-total_spaces" className="mb-1.5 block text-sm font-medium text-gray-700">总车位数 <span className="text-red-500">*</span></Label>
                    <Input
                      id="edit-total_spaces"
                      type="number"
                      {...register('total_spaces', { valueAsNumber: true, min: { value: 1, message: '车位数至少为1' } })}
                      className={`h-11 rounded-xl border px-4 text-sm shadow-none ${errors.total_spaces ? 'border-red-500 focus-visible:ring-red-500/10' : 'border-gray-200 bg-gray-50/60 hover:bg-white focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-brand-500/10'}`}
                    />
                    {errors.total_spaces && (
                      <p className="mt-1 text-sm text-red-500">{errors.total_spaces.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="edit-lot_type" className="mb-1.5 block text-sm font-medium text-gray-700">车场类型</Label>
                    <Select
                      value={lotType}
                      onValueChange={(v) => setValue('lot_type', v as LotType)}
                    >
                      <SelectTrigger className="h-11 rounded-xl border border-gray-200 bg-gray-50/60 px-4 text-sm shadow-none hover:bg-white focus:border-brand-500 focus:ring-brand-500/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="underground">地下停车场</SelectItem>
                        <SelectItem value="ground">地面停车场</SelectItem>
                        <SelectItem value="stereo">立体车库</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-surface-border bg-slate-50/70 p-5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">运营控制</p>
                  <p className="mt-1 text-xs text-gray-500">启用或暂停车场运营状态，并快速确认当前出入口规模。</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">运营状态</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {status === 'active' ? '保持车场正常接入与展示，适用于日常运营状态。' : '暂停后将弱化展示与监控状态，适用于维护或临时停用场景。'}
                      </p>
                    </div>
                    <Switch
                      id="edit-status"
                      checked={status === 'active'}
                      onCheckedChange={(checked) => setValue('status', checked ? 'active' : 'inactive')}
                    />
                  </div>
                  <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {currentStatus}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/80 bg-white p-4">
                    <div className="text-xs text-gray-400">入口数量</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">{lot.entry_count}</div>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white p-4">
                    <div className="text-xs text-gray-400">出口数量</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">{lot.exit_count}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-surface-border bg-slate-50/80 flex items-center justify-end gap-3">
            <button type="button" onClick={() => onOpenChange(false)} className="h-10 px-5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </span>
              ) : (
                '保存修改'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
