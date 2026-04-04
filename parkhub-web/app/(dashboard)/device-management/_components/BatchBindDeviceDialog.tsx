"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/FontAwesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { usePermissions, useUser } from "@/lib/auth/hooks";
import { useTenants } from "@/lib/tenant/hooks";
import { useGates, useParkingLots } from "@/lib/parking-lot/hooks";
import type { Device } from "@/lib/device/types";
import { formatCount } from "./constants";

interface BatchBindDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDevices: Device[];
  onSubmit: (data: { tenant_id: string; parking_lot_id: string; gate_id: string }) => Promise<void>;
}

export function BatchBindDeviceDialog({
  open,
  onOpenChange,
  selectedDevices,
  onSubmit,
}: BatchBindDeviceDialogProps) {
  const user = useUser();
  const { isPlatformAdmin } = usePermissions();
  const [tenantId, setTenantId] = useState("");
  const [parkingLotId, setParkingLotId] = useState("");
  const [gateId, setGateId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousTenantId = useRef("");
  const previousParkingLotId = useRef("");

  useEffect(() => {
    if (!open) return;
    const nextTenantId = isPlatformAdmin ? "" : user?.tenant_id || "";
    setTenantId(nextTenantId);
    setParkingLotId("");
    setGateId("");
    previousTenantId.current = nextTenantId;
    previousParkingLotId.current = "";
  }, [open, isPlatformAdmin, user?.tenant_id]);

  const { data: tenantsData, isLoading: isLoadingTenants } = useTenants(
    { page: 1, page_size: 100 },
    open && isPlatformAdmin
  );
  const tenantOptions = tenantsData?.items || [];

  const effectiveTenantId = isPlatformAdmin ? tenantId : user?.tenant_id || "";
  const { data: parkingLotsData, isLoading: isLoadingLots } = useParkingLots(
    {
      tenant_id: effectiveTenantId || undefined,
      page: 1,
      page_size: 100,
    },
    open && !!effectiveTenantId
  );
  const parkingLots = parkingLotsData?.items || [];
  const { data: gatesData = [], isLoading: isLoadingGates } = useGates(
    open ? parkingLotId : ""
  );

  useEffect(() => {
    if (tenantId === previousTenantId.current) return;
    setParkingLotId("");
    setGateId("");
    previousTenantId.current = tenantId;
  }, [tenantId]);

  useEffect(() => {
    if (parkingLotId === previousParkingLotId.current) return;
    setGateId("");
    previousParkingLotId.current = parkingLotId;
  }, [parkingLotId]);

  const handleSubmit = async () => {
    if (!selectedDevices.length) return;
    if (!effectiveTenantId) {
      toast.error("请选择租户");
      return;
    }
    if (!parkingLotId || !gateId) {
      toast.error("请选择车场和出入口");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        tenant_id: effectiveTenantId,
        parking_lot_id: parkingLotId,
        gate_id: gateId,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "批量绑定失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-[4px]"
        className="overflow-hidden rounded-[28px] border-0 bg-white p-0 shadow-[0_30px_80px_-25px_rgba(15,23,42,0.35)] ring-0 sm:max-w-lg"
      >
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-950">
                  批量绑定设备
                </DialogTitle>
                <p className="mt-1 text-sm text-slate-500">
                  已选择 {formatCount(selectedDevices.length)} 台设备，绑定到同一出入口。
                </p>
              </div>
            </div>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-slate-700">
              <Icon icon={faXmark} />
            </DialogClose>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-500">
            {selectedDevices
              .slice(0, 3)
              .map((device) => device.name || device.id)
              .join("、")}
            {selectedDevices.length > 3
              ? ` 等 ${formatCount(selectedDevices.length)} 台`
              : ""}
          </div>

          {isPlatformAdmin && (
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                租户 <span className="text-rose-500">*</span>
              </Label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white"
              >
                <option value="">请选择租户</option>
                {tenantOptions.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.company_name}
                  </option>
                ))}
              </select>
              {isLoadingTenants && (
                <p className="mt-1.5 text-xs text-slate-400">正在加载租户列表...</p>
              )}
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-sm font-medium text-slate-700">
              车场 <span className="text-rose-500">*</span>
            </Label>
            <select
              value={parkingLotId}
              onChange={(e) => setParkingLotId(e.target.value)}
              disabled={!effectiveTenantId}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <option value="">请选择车场</option>
              {parkingLots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name}
                </option>
              ))}
            </select>
            {isLoadingLots && effectiveTenantId && (
              <p className="mt-1.5 text-xs text-slate-400">正在加载车场列表...</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-medium text-slate-700">
              出入口 <span className="text-rose-500">*</span>
            </Label>
            <select
              value={gateId}
              onChange={(e) => setGateId(e.target.value)}
              disabled={!parkingLotId}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <option value="">请选择出入口</option>
              {gatesData.map((gate) => (
                <option key={gate.id} value={gate.id}>
                  {gate.name} · 已绑 {gate.bound_device_count || 0} 台
                </option>
              ))}
            </select>
            {isLoadingGates && parkingLotId && (
              <p className="mt-1.5 text-xs text-slate-400">正在加载出入口列表...</p>
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
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary h-10 rounded-xl px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                提交中
              </span>
            ) : (
              "确认批量绑定"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
