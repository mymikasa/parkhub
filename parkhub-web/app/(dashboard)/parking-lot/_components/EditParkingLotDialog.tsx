"use client";

import { useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateParkingLot } from "@/lib/parking-lot/hooks";
import type { ParkingLot, LotType } from "@/lib/parking-lot/types";
import { LotPreviewCard } from "./LotPreviewCard";

interface UpdateFormData {
  name: string;
  address: string;
  total_spaces: number;
  lot_type: "underground" | "ground" | "stereo";
  status: "active" | "inactive";
}

interface EditParkingLotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: ParkingLot | null;
  onSuccess: () => void;
}

export function EditParkingLotDialog({
  open,
  onOpenChange,
  lot,
  onSuccess,
}: EditParkingLotDialogProps) {
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
      name: "",
      address: "",
      total_spaces: 0,
      lot_type: "underground",
      status: "active",
    },
  });

  const lotType = watch("lot_type");
  const status = watch("status");
  const currentTotalSpaces = watch("total_spaces");

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
      toast.success("修改已保存");
      onSuccess();
    } catch {
      toast.error("保存失败，请重试");
    }
  };

  if (!lot) return null;

  const currentStatus = status === "active" ? "运营中" : "暂停运营";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-[4px]"
        className="sm:max-w-2xl rounded-2xl bg-white p-0 gap-0 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0"
      >
        <div className="px-6 py-5 border-b border-surface-border flex items-start justify-between">
          <div>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              编辑停车场
            </DialogTitle>
            <p className="mt-1 text-sm text-gray-500">
              更新基础资料与运营状态，修改会立即同步到当前车场列表。
            </p>
          </div>
          <DialogClose className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <Icon icon={faXmark} />
          </DialogClose>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-6">
            <LotPreviewCard lot={lot} status={status} lotType={lotType} currentTotalSpaces={currentTotalSpaces} />

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5 rounded-2xl border border-surface-border bg-white p-5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">基础信息</p>
                  <p className="mt-1 text-xs text-gray-500">
                    编辑后的名称、地址与容量会同步影响运营列表、搜索与概览展示。
                  </p>
                </div>
                <div>
                  <Label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium text-gray-700">
                    车场名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    {...register("name", { required: "请输入车场名称" })}
                    className={`h-11 rounded-xl border px-4 text-sm shadow-none ${
                      errors.name
                        ? "border-red-500 focus-visible:ring-red-500/10"
                        : "border-gray-200 bg-gray-50/60 hover:bg-white focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-brand-500/10"
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-address" className="mb-1.5 block text-sm font-medium text-gray-700">
                    车场地址 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-address"
                    {...register("address", { required: "请输入车场地址" })}
                    className={`h-11 rounded-xl border px-4 text-sm shadow-none ${
                      errors.address
                        ? "border-red-500 focus-visible:ring-red-500/10"
                        : "border-gray-200 bg-gray-50/60 hover:bg-white focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-brand-500/10"
                    }`}
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-total_spaces" className="mb-1.5 block text-sm font-medium text-gray-700">
                      总车位数 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-total_spaces"
                      type="number"
                      {...register("total_spaces", {
                        valueAsNumber: true,
                        min: { value: 1, message: "车位数至少为1" },
                      })}
                      className={`h-11 rounded-xl border px-4 text-sm shadow-none ${
                        errors.total_spaces
                          ? "border-red-500 focus-visible:ring-red-500/10"
                          : "border-gray-200 bg-gray-50/60 hover:bg-white focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-brand-500/10"
                      }`}
                    />
                    {errors.total_spaces && <p className="mt-1 text-sm text-red-500">{errors.total_spaces.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="edit-lot_type" className="mb-1.5 block text-sm font-medium text-gray-700">
                      车场类型
                    </Label>
                    <Select value={lotType} onValueChange={(v) => setValue("lot_type", v as LotType)}>
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
                  <p className="mt-1 text-xs text-gray-500">
                    启用或暂停车场运营状态，并快速确认当前出入口规模。
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">运营状态</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {status === "active"
                          ? "保持车场正常接入与展示，适用于日常运营状态。"
                          : "暂停后将弱化展示与监控状态，适用于维护或临时停用场景。"}
                      </p>
                    </div>
                    <Switch
                      id="edit-status"
                      checked={status === "active"}
                      onCheckedChange={(checked) => setValue("status", checked ? "active" : "inactive")}
                    />
                  </div>
                  <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
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
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </span>
              ) : (
                "保存修改"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
