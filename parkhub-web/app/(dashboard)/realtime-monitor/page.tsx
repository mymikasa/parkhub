"use client";

import { Header } from "@/components/layout/Header";

export default function RealtimeMonitorPage() {
  return (
    <>
      <Header
        title="实时监控"
        description="监控车场实时状态、通行记录与在场车辆"
      />
      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-5">
          {/* Stats cards placeholder */}
          <div className="bg-white rounded-xl p-5 border border-surface-border">
            <p className="text-sm text-gray-500">今日入场</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">--</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-surface-border">
            <p className="text-sm text-gray-500">今日出场</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">--</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-surface-border">
            <p className="text-sm text-gray-500">在场车辆</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">--</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-surface-border">
            <p className="text-sm text-gray-500">今日收入</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">--</p>
          </div>
        </div>
      </div>
    </>
  );
}
