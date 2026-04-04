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
import { Loader2, Plus } from "lucide-react";
import { useCreateDevice } from "@/lib/device/hooks";

interface CreateDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateDeviceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDeviceDialogProps) {
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
