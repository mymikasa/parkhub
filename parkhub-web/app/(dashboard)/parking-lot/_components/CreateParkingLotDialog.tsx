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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateParkingLot } from "@/lib/parking-lot/hooks";
import type { LotType } from "@/lib/parking-lot/types";

interface CreateFormData {
  name: string;
  address: string;
  total_spaces: number;
  lot_type: "underground" | "ground" | "stereo";
}

interface CreateParkingLotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateParkingLotDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateParkingLotDialogProps) {
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
      name: "",
      address: "",
      total_spaces: 0,
      lot_type: "underground",
    },
  });

  const lotType = watch("lot_type");

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        address: "",
        total_spaces: 0,
        lot_type: "underground",
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateFormData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("车场创建成功");
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
        className="sm:max-w-lg rounded-2xl bg-white p-0 gap-0 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0"
      >
        <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            新建停车场
          </DialogTitle>
          <DialogClose className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <Icon icon={faXmark} />
          </DialogClose>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-5">
            <div>
              <Label
                htmlFor="name"
                className="text-sm font-medium text-gray-700 mb-1.5 block"
              >
                车场名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register("name", { required: "请输入车场名称" })}
                placeholder="如：万科翡翠滨江地下停车场"
                className={`h-11 px-4 rounded-lg border-gray-200 text-sm ${
                  errors.name ? "border-red-500" : ""
                }`}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="address"
                className="text-sm font-medium text-gray-700 mb-1.5 block"
              >
                车场地址 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                {...register("address", { required: "请输入车场地址" })}
                placeholder="省/市/区/街道/门牌号"
                className={`h-11 px-4 rounded-lg border-gray-200 text-sm ${
                  errors.address ? "border-red-500" : ""
                }`}
              />
              {errors.address && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.address.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="total_spaces"
                  className="text-sm font-medium text-gray-700 mb-1.5 block"
                >
                  总车位数 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_spaces"
                  type="number"
                  {...register("total_spaces", {
                    valueAsNumber: true,
                    min: { value: 1, message: "车位数至少为1" },
                  })}
                  placeholder="0"
                  className={`h-11 px-4 rounded-lg border-gray-200 text-sm ${
                    errors.total_spaces ? "border-red-500" : ""
                  }`}
                />
                {errors.total_spaces && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.total_spaces.message}
                  </p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="lot_type"
                  className="text-sm font-medium text-gray-700 mb-1.5 block"
                >
                  车场类型
                </Label>
                <Select
                  value={lotType}
                  onValueChange={(v) => setValue("lot_type", v as LotType)}
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
                "确认创建"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
