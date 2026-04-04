"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalculateFee } from "@/lib/billing-rules/hooks";
import { Calculator } from "lucide-react";
import type { ParkingLot } from "@/lib/parking-lot/types";
import type { CalculateFeeResponse } from "@/lib/billing-rules/types";

export function FeeCalculatorDialog({ parkingLots }: {
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
