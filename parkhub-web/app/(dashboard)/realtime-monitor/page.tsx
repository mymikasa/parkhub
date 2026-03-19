"use client";

import {
  faArrowRightToBracket,
  faArrowRightFromBracket,
  faCar,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/realtime-monitor/StatCard";
import { LiveTransitFeed } from "@/components/realtime-monitor/LiveTransitFeed";
import { ParkingAvailability } from "@/components/realtime-monitor/ParkingAvailability";
import { OverstayAlerts } from "@/components/realtime-monitor/OverstayAlerts";
import { useTransitStats, useLatestTransitRecords, useOverstayRecords } from "@/lib/transit-record";
import { useParkingLots } from "@/lib/parking-lot/hooks";

function formatNumber(n: number): string {
  return n.toLocaleString("zh-CN");
}

function formatCurrency(n: number): string {
  return `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function RealtimeMonitorPage() {
  const { data: stats } = useTransitStats(60000);
  const { data: latestRecords } = useLatestTransitRecords(10000);
  const { data: overstayRecords } = useOverstayRecords(60000);
  const { data: parkingLotData } = useParkingLots({ page: 1, page_size: 50, status: "active" });

  const parkingLots = parkingLotData?.items ?? [];
  const totalSpaces = parkingLots.reduce((sum, lot) => sum + lot.total_spaces, 0);
  const onSiteCount = stats?.on_site_count ?? 0;
  const usageRate = totalSpaces > 0 ? ((onSiteCount / totalSpaces) * 100).toFixed(1) : "0.0";

  return (
    <>
      <Header
        title="实时监控"
        description="监控车场实时状态、通行记录与在场车辆"
      />

      {/* 统计卡片 */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-5">
          <StatCard
            label="今日入场"
            value={formatNumber(stats?.entry_count ?? 0)}
            icon={faArrowRightToBracket}
            color="emerald"
            subtitle="较昨日同时段"
          />
          <StatCard
            label="今日出场"
            value={formatNumber(stats?.exit_count ?? 0)}
            icon={faArrowRightFromBracket}
            color="blue"
            subtitle="较昨日同时段"
          />
          <StatCard
            label="在场车辆"
            value={formatNumber(onSiteCount)}
            icon={faCar}
            color="amber"
            subtitle={`总车位 ${formatNumber(totalSpaces)} · 使用率 ${usageRate}%`}
          />
          <StatCard
            label="今日收入"
            value={formatCurrency(stats?.today_revenue ?? 0)}
            icon={faWallet}
            color="violet"
            subtitle="较昨日同时段"
          />
        </div>
      </div>

      {/* 主内容区 */}
      <div className="px-8 pb-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧：实时通行记录 */}
          <div className="col-span-7">
            <LiveTransitFeed records={latestRecords ?? []} />
          </div>

          {/* 右侧 */}
          <div className="col-span-5 space-y-6">
            <ParkingAvailability parkingLots={parkingLots} />
            <OverstayAlerts records={overstayRecords ?? []} />
          </div>
        </div>
      </div>
    </>
  );
}
