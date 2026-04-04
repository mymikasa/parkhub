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
import { toast } from "sonner";
import { Cpu, Loader2, Pencil } from "lucide-react";
import { useUpdateDeviceName } from "@/lib/device/hooks";
import type { Device } from "@/lib/device/types";
import { STATUS_CONFIG } from "./constants";

interface EditDeviceNameDialogProps {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditDeviceNameDialog({
  device,
  open,
  onOpenChange,
  onSuccess,
}: EditDeviceNameDialogProps) {
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
