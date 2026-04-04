"use client";

import { Car, DoorOpen, ParkingCircle } from "lucide-react";
import { formatNumber } from "./constants";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  isLoading: boolean;
}

function StatsCard({ title, value, icon: Icon, iconBg, iconColor, valueColor, isLoading }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold ${valueColor} mt-1`}>
            {isLoading ? "..." : formatNumber(value)}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

interface ParkingLotStatsProps {
  stats?: {
    total_spaces: number;
    available_spaces: number;
    occupied_vehicles: number;
    total_gates: number;
  } | null;
  isLoading: boolean;
}

export function ParkingLotStats({ stats, isLoading }: ParkingLotStatsProps) {
  return (
    <div className="px-8 py-6">
      <div className="grid grid-cols-4 gap-5">
        <StatsCard title="总车位数" value={stats?.total_spaces || 0} icon={ParkingCircle} iconBg="bg-blue-50" iconColor="text-blue-600" valueColor="text-gray-900" isLoading={isLoading} />
        <StatsCard title="剩余车位" value={stats?.available_spaces || 0} icon={Car} iconBg="bg-emerald-50" iconColor="text-emerald-600" valueColor="text-emerald-600" isLoading={isLoading} />
        <StatsCard title="在场车辆" value={stats?.occupied_vehicles || 0} icon={Car} iconBg="bg-amber-50" iconColor="text-amber-600" valueColor="text-gray-900" isLoading={isLoading} />
        <StatsCard title="出入口数" value={stats?.total_gates || 0} icon={DoorOpen} iconBg="bg-violet-50" iconColor="text-violet-600" valueColor="text-gray-900" isLoading={isLoading} />
      </div>
    </div>
  );
}
