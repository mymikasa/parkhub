'use client';

import {
  Users,
  UserCheck,
  UserX,
  Shield,
  UserPlus,
} from "lucide-react";

interface UserStatsCardsProps {
  stats: {
    total: number;
    active: number;
    frozen: number;
    tenant_admins: number;
    operators: number;
  };
  isLoading: boolean;
}

export function UserStatsCards({ stats, isLoading }: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-5 gap-5">
      <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">总用户数</p>
            {isLoading ? (
              <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="text-blue-600 w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className="text-gray-400">系统全部用户</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">活跃用户</p>
            {isLoading ? (
              <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <UserCheck className="text-emerald-600 w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 status-dot" />
          <span className="text-gray-400">占比 {!isLoading && stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : '-'}%</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">冻结用户</p>
            {isLoading ? (
              <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.frozen}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <UserX className="text-red-500 w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className="text-gray-400">已禁用账户</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">租户管理员</p>
            {isLoading ? (
              <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.tenant_admins}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Shield className="text-blue-600 w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className="text-gray-400">管理各自租户</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">操作员</p>
            {isLoading ? (
              <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.operators}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <UserPlus className="text-gray-600 w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className="text-gray-400">日常运维人员</span>
        </div>
      </div>
    </div>
  );
}
