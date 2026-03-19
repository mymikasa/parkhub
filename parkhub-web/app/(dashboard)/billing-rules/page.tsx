"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParkingLots } from "@/lib/parking-lot/hooks";
import { useBillingRule, useUpdateBillingRule, useCalculateFee } from "@/lib/billing-rules/hooks";
import { useTenants } from "@/lib/tenant/hooks";
import { usePermissions, useUser } from "@/lib/auth/hooks";
import { Calculator, Building2, Check, Gift, Coins, Umbrella, Info } from "lucide-react";
import type { ParkingLot } from "@/lib/parking-lot/types";
import type { CalculateFeeResponse } from "@/lib/billing-rules/types";

// ─── Lot icon color rotation ─────────────────────────
const LOT_COLORS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
];

function getLotColor(index: number) {
  return LOT_COLORS[index % LOT_COLORS.length];
}

const LOT_ICONS = [
  "fa-solid fa-building",
  "fa-solid fa-shop",
  "fa-solid fa-house-chimney",
  "fa-solid fa-hotel",
  "fa-solid fa-warehouse",
];

function getLotIcon(index: number) {
  return LOT_ICONS[index % LOT_ICONS.length];
}

export default function BillingRulesPage() {
  const permissions = usePermissions();
  const user = useUser();
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedLotId, setSelectedLotId] = useState<string>("");
  const [calcOpen, setCalcOpen] = useState(false);

  // For platform_admin, load tenant list
  const { data: tenantsData } = useTenants({}, permissions.isPlatformAdmin);

  // Determine which tenant to query
  const activeTenantId = permissions.isPlatformAdmin ? selectedTenantId : (user?.tenant_id || "");

  // Load parking lots for active tenant
  const { data: lotsData, isLoading: lotsLoading } = useParkingLots(
    { tenant_id: activeTenantId, page: 1, page_size: 100 },
    !!activeTenantId
  );

  const parkingLots = useMemo(() => lotsData?.items || [], [lotsData?.items]);

  // Auto-select first lot
  useEffect(() => {
    if (parkingLots.length > 0 && !selectedLotId) {
      setSelectedLotId(parkingLots[0].id);
    }
  }, [parkingLots, selectedLotId]);

  // Reset lot selection when tenant changes
  useEffect(() => {
    setSelectedLotId("");
  }, [activeTenantId]);

  // Auto-select first tenant for platform admin
  useEffect(() => {
    if (permissions.isPlatformAdmin && tenantsData?.items?.length && !selectedTenantId) {
      setSelectedTenantId(tenantsData.items[0].id);
    }
  }, [permissions.isPlatformAdmin, tenantsData, selectedTenantId]);

  const hasLots = parkingLots.length > 0;
  const selectedLot = parkingLots.find((l) => l.id === selectedLotId);

  return (
    <>
      <Header
        title="计费规则配置"
        description="设置各停车场的计费规则，支持免费时长、按时计费、每日封顶"
        actions={
          hasLots ? (
            <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
              <DialogTrigger className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                <Calculator className="h-4 w-4 text-gray-400" />
                费用计算器
              </DialogTrigger>
              <FeeCalculatorDialog parkingLots={parkingLots} />
            </Dialog>
          ) : undefined
        }
      />
      <div className="px-8 py-6 space-y-6">
        {/* Platform admin tenant selector */}
        {permissions.isPlatformAdmin && (
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-gray-500 whitespace-nowrap">选择租户</Label>
            <Select value={selectedTenantId} onValueChange={(v) => setSelectedTenantId(v ?? "")}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="请选择租户" />
              </SelectTrigger>
              <SelectContent>
                {tenantsData?.items?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left panel: parking lot list */}
          <div className="col-span-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-900">选择停车场</span>
              </div>
              <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {lotsLoading ? (
                  <div className="p-8 text-center text-gray-400">加载中...</div>
                ) : !hasLots ? (
                  <div className="p-8 text-center">
                    <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">暂无停车场，请先创建</p>
                  </div>
                ) : (
                  parkingLots.map((lot, index) => (
                    <ParkingLotCard
                      key={lot.id}
                      lot={lot}
                      index={index}
                      isSelected={lot.id === selectedLotId}
                      onClick={() => setSelectedLotId(lot.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right panel: billing rule editor */}
          <div className="col-span-8">
            {selectedLotId && hasLots ? (
              <BillingRuleEditor parkingLotId={selectedLotId} lotName={selectedLot?.name || ""} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {hasLots ? "请选择一个停车场" : "暂无停车场，请先创建停车场后配置计费规则"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Parking Lot Card ────────────────────────────────

function ParkingLotCard({ lot, index, isSelected, onClick }: {
  lot: ParkingLot;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const inactive = lot.status !== "active";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
          : "border-gray-200 hover:border-gray-300"
      } ${inactive ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${inactive ? "from-gray-400 to-gray-500" : getLotColor(index)} flex items-center justify-center`}>
            <i className={`${getLotIcon(index)} text-white text-sm`} />
          </div>
          <div>
            <div className="font-medium text-gray-900 text-sm">{lot.name}</div>
            <div className="text-xs text-gray-500">
              {inactive ? "暂停运营" : `${lot.total_spaces} 车位`}
            </div>
          </div>
        </div>
        {isSelected && <Check className="h-4 w-4 text-blue-600" />}
      </div>
    </button>
  );
}

// ─── Billing Rule Editor ─────────────────────────────

function BillingRuleEditor({ parkingLotId, lotName }: { parkingLotId: string; lotName: string }) {
  const { data: rule, isLoading } = useBillingRule(parkingLotId);
  const updateMutation = useUpdateBillingRule();

  const [freeMinutes, setFreeMinutes] = useState(15);
  const [pricePerHour, setPricePerHour] = useState(2);
  const [dailyCap, setDailyCap] = useState(20);
  const [noCap, setNoCap] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync form from rule data
  useEffect(() => {
    if (rule) {
      setFreeMinutes(rule.free_minutes);
      setPricePerHour(rule.price_per_hour);
      setDailyCap(rule.daily_cap);
      setNoCap(rule.daily_cap === 0);
    }
  }, [rule]);

  const handleSave = async () => {
    if (!rule) return;
    try {
      await updateMutation.mutateAsync({
        id: rule.id,
        data: {
          free_minutes: freeMinutes,
          price_per_hour: pricePerHour,
          daily_cap: noCap ? 0 : dailyCap,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // error handled by mutation
    }
  };

  const handleReset = () => {
    if (rule) {
      setFreeMinutes(rule.free_minutes);
      setPricePerHour(rule.price_per_hour);
      setDailyCap(rule.daily_cap);
      setNoCap(rule.daily_cap === 0);
    }
  };

  const effectiveDailyCap = noCap ? 0 : dailyCap;
  const hasChanges = rule && (
    freeMinutes !== rule.free_minutes ||
    pricePerHour !== rule.price_per_hour ||
    effectiveDailyCap !== rule.daily_cap
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">加载计费规则中...</p>
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500">该停车场暂无计费规则</p>
      </div>
    );
  }

  const displayFreeMinutes = freeMinutes;
  const displayPricePerHour = pricePerHour;
  const displayDailyCap = noCap ? 0 : dailyCap;

  return (
    <div className="space-y-6">
      {/* Current rule summary */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-900">计费规则</span>
            <span className="ml-2 text-xs text-gray-500">{lotName}</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600">
            <Check className="h-3 w-3" />
            已启用
          </span>
        </div>
        <div className="p-6">
          {/* Three summary cards */}
          <div className="grid grid-cols-3 gap-6">
            {/* 免费时长 */}
            <div className="p-5 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Gift className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">免费时长</span>
              </div>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-3xl font-bold text-gray-900">{displayFreeMinutes}</span>
                <span className="text-sm text-gray-500 mb-1">分钟</span>
              </div>
              <p className="text-xs text-gray-500">停车不超过{displayFreeMinutes}分钟免费</p>
            </div>

            {/* 计费单价 */}
            <div className="p-5 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">计费单价</span>
              </div>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-sm text-gray-500 mb-1">¥</span>
                <span className="text-3xl font-bold text-gray-900">{displayPricePerHour}</span>
                <span className="text-sm text-gray-500 mb-1">/小时</span>
              </div>
              <p className="text-xs text-gray-500">不足1小时按1小时计算</p>
            </div>

            {/* 每日封顶 */}
            <div className="p-5 rounded-xl bg-amber-50/50 border border-amber-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Umbrella className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">每日封顶</span>
              </div>
              <div className="flex items-end gap-1 mb-3">
                {displayDailyCap === 0 ? (
                  <span className="text-3xl font-bold text-gray-900">不封顶</span>
                ) : (
                  <>
                    <span className="text-sm text-gray-500 mb-1">¥</span>
                    <span className="text-3xl font-bold text-gray-900">{displayDailyCap}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {displayDailyCap === 0
                  ? "24小时计费无上限"
                  : `24小时内最高收费${displayDailyCap}元`}
              </p>
            </div>
          </div>

          {/* 计费规则说明 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">计费规则说明</p>
                <ul className="space-y-1 text-xs">
                  <li>• 停车{displayFreeMinutes}分钟内免费出场</li>
                  <li>• 超过{displayFreeMinutes}分钟后，从入场时间开始计费，每小时{displayPricePerHour}元</li>
                  <li>• 不足1小时按1小时计算（向上取整）</li>
                  {displayDailyCap > 0 ? (
                    <li>• 每24小时封顶{displayDailyCap}元，超过24小时重新计费</li>
                  ) : (
                    <li>• 24小时计费无上限</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-900">修改规则</span>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {/* 免费时长 */}
            <SliderField
              label="免费时长"
              value={freeMinutes}
              onChange={setFreeMinutes}
              min={0}
              max={120}
              step={1}
              midLabel="60分钟"
              minLabel="0分钟"
              maxLabel="120分钟"
              inputSuffix="分钟"
            />

            {/* 计费单价 */}
            <SliderField
              label="计费单价（元/小时）"
              value={pricePerHour}
              onChange={setPricePerHour}
              min={1}
              max={50}
              step={0.5}
              minLabel="¥1"
              midLabel="¥25"
              maxLabel="¥50"
              inputPrefix="¥"
            />

            {/* 每日封顶 */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">每日封顶金额</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">¥</span>
                  <Input
                    type="number"
                    value={noCap ? 0 : dailyCap}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0 && v <= 500) {
                        setDailyCap(v);
                        if (v > 0) setNoCap(false);
                      }
                    }}
                    min={0}
                    max={500}
                    disabled={noCap}
                    className="w-20 h-9 px-3 rounded-lg text-sm text-center font-medium text-gray-900"
                  />
                </div>
              </div>
              <div className="py-2">
                <Slider
                  value={[noCap ? 0 : dailyCap]}
                  onValueChange={(v) => {
                    const val = Array.isArray(v) ? v[0] : v;
                    setDailyCap(val);
                    if (val > 0) setNoCap(false);
                  }}
                  min={0}
                  max={500}
                  step={4}
                  disabled={noCap}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>¥0</span>
                <span>¥250</span>
                <span>¥500</span>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
                <Checkbox
                  id="no-limit"
                  checked={noCap}
                  onCheckedChange={(checked) => {
                    setNoCap(!!checked);
                    if (checked) setDailyCap(0);
                  }}
                />
                <label htmlFor="no-limit" className="text-sm text-gray-600 cursor-pointer">
                  不设封顶（24小时计费无上限）
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-end gap-3">
            {updateMutation.isError && (
              <span className="text-sm text-red-500 mr-auto">保存失败，请重试</span>
            )}
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              重置
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all"
            >
              {updateMutation.isPending ? "保存中..." : saved ? "已保存" : "保存规则"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slider + Input Field ────────────────────────────

function SliderField({ label, value, onChange, min, max, step, minLabel, midLabel, maxLabel, inputPrefix, inputSuffix }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  midLabel: string;
  maxLabel: string;
  inputPrefix?: string;
  inputSuffix?: string;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          {inputPrefix && <span className="text-sm text-gray-500">{inputPrefix}</span>}
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= min && v <= max) onChange(v);
            }}
            min={min}
            max={max}
            step={step}
            className="w-20 h-9 px-3 rounded-lg text-sm text-center font-medium text-gray-900"
          />
          {inputSuffix && <span className="text-sm text-gray-500">{inputSuffix}</span>}
        </div>
      </div>
      <div className="py-2">
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
          min={min}
          max={max}
          step={step}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{minLabel}</span>
        <span>{midLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

// ─── Fee Calculator Dialog ───────────────────────────

function FeeCalculatorDialog({ parkingLots }: {
  parkingLots: ParkingLot[];
}) {
  const calculateMutation = useCalculateFee();
  const [lotId, setLotId] = useState(parkingLots[0]?.id || "");
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [result, setResult] = useState<CalculateFeeResponse | null>(null);

  const handleCalculate = async () => {
    if (!lotId || !entryTime || !exitTime) return;
    try {
      const res = await calculateMutation.mutateAsync({
        parking_lot_id: lotId,
        entry_time: new Date(entryTime).toISOString(),
        exit_time: new Date(exitTime).toISOString(),
      });
      setResult(res);
    } catch {
      // error handled by mutation
    }
  };

  const isValid = lotId && entryTime && exitTime && new Date(exitTime) > new Date(entryTime);

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}分钟`;
    if (m === 0) return `${h}小时`;
    return `${h}小时 ${m}分钟`;
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-gray-900">费用计算器</DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">停车场</label>
          <Select value={lotId} onValueChange={(v) => setLotId(v ?? "")}>
            <SelectTrigger className="w-full h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {parkingLots.map((lot) => (
                <SelectItem key={lot.id} value={lot.id}>{lot.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">入场时间</label>
            <Input
              type="datetime-local"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className="h-11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">出场时间</label>
            <Input
              type="datetime-local"
              value={exitTime}
              onChange={(e) => setExitTime(e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        {entryTime && exitTime && new Date(exitTime) <= new Date(entryTime) && (
          <p className="text-sm text-red-500">出场时间必须晚于入场时间</p>
        )}

        {calculateMutation.isError && (
          <p className="text-sm text-red-500">计算失败，请检查参数</p>
        )}

        {/* Calculation result */}
        {result && (
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">停车时长</span>
              <span className="text-lg font-semibold text-gray-900">{formatDuration(result.parking_duration)}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">免费时长</span>
              <span className="text-sm text-gray-600">{result.free_minutes}分钟</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">计费时长</span>
              <span className="text-sm text-gray-600">
                {formatDuration(result.billable_minutes)} → {result.billable_hours}小时
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">计费单价</span>
              <span className="text-sm text-gray-600">¥{result.price_per_hour}/小时</span>
            </div>
            <div className="h-px bg-gray-200 my-4" />
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-700">应付金额</span>
              <span className="text-2xl font-bold text-blue-600">¥{result.final_fee.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer with calculate button */}
      <div className="flex items-center justify-center pt-2">
        <Button
          onClick={handleCalculate}
          disabled={!isValid || calculateMutation.isPending}
          variant="secondary"
          className="px-8"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {calculateMutation.isPending ? "计算中..." : result ? "重新计算" : "计算费用"}
        </Button>
      </div>
    </DialogContent>
  );
}
