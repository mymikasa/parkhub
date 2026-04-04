"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useBillingRule, useUpdateBillingRule } from "@/lib/billing-rules/hooks";
import { Check, Gift, Coins, Umbrella, Info } from "lucide-react";

export function BillingRuleEditor({ parkingLotId, lotName }: { parkingLotId: string; lotName: string }) {
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
