"use client";

import type { TransitRecord } from "@/lib/transit-record";

interface OverstayAlertsProps {
  records: TransitRecord[];
}

function calcDurationMinutes(createdAt: string): number {
  const now = new Date();
  const entry = new Date(createdAt);
  return Math.max(0, Math.floor((now.getTime() - entry.getTime()) / 60000));
}

function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}天 ${hours}小时`;
  return `${hours}小时`;
}

function getDurationColor(minutes: number): string {
  if (minutes > 48 * 60) return "text-red-600";
  return "text-amber-600";
}

function formatEntryTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${mins}`;
}

export function OverstayAlerts({ records }: OverstayAlertsProps) {
  return (
    <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">长时间停放预警</span>
        <span className="text-xs text-amber-600 font-medium">{records.length} 辆</span>
      </div>
      <div className="divide-y divide-gray-100">
        {records.map((record) => {
          const durationMin = calcDurationMinutes(record.created_at);
          return (
            <div
              key={record.id}
              className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
            >
              <div>
                <span className="font-mono font-bold text-sm text-gray-900">
                  {record.plate_number || "未知"}
                </span>
                <div className="text-xs text-gray-500 mt-0.5">
                  入场: {formatEntryTime(record.created_at)}
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-medium ${getDurationColor(durationMin)}`}>
                  {formatDuration(durationMin)}
                </span>
                <div className="text-xs text-gray-400">{record.parking_lot_name}</div>
              </div>
            </div>
          );
        })}
        {records.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">暂无超时预警</div>
        )}
      </div>
    </div>
  );
}
