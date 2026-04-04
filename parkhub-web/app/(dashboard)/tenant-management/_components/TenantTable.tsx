"use client";

import { Input } from "@/components/ui/input";
import { Pencil, Snowflake, RotateCcw, Warehouse, Plus, Search } from "lucide-react";
import { Pagination } from "@/components/shared/Pagination";
import type { Tenant, TenantStatus } from "@/lib/tenant/types";
import { getAvatarGradient } from "./constants";

interface TenantTableProps {
  tenants: Tenant[];
  isLoading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  statusFilter: TenantStatus | "all";
  searchQuery: string;
  onStatusFilterChange: (value: TenantStatus | "all") => void;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (tenant: Tenant) => void;
  onViewLots: (tenant: Tenant) => void;
  onFreeze: (tenant: Tenant) => void;
  onUnfreeze: (tenant: Tenant) => void;
  onCreateTenant: () => void;
}

export function TenantTable({
  tenants,
  isLoading,
  total,
  currentPage,
  pageSize,
  statusFilter,
  searchQuery,
  onStatusFilterChange,
  onSearchChange,
  onPageChange,
  onEdit,
  onViewLots,
  onFreeze,
  onUnfreeze,
  onCreateTenant,
}: TenantTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="px-8 pb-8">
      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        {/* List header with tabs */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900">租户列表</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {([["all", "全部"], ["active", "正常"], ["frozen", "冻结"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => onStatusFilterChange(value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    statusFilter === value
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="搜索租户..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 h-10 pl-10 pr-4 rounded-lg border-gray-200 text-sm"
              />
            </div>
            <button
              onClick={onCreateTenant}
              className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              新建租户
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">租户信息</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">联系人</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">车场数</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-200" />
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-16 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="w-14 h-6 bg-gray-200 rounded-full mx-auto" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                      <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                      <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500 text-sm">暂无租户数据</td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarGradient(tenant.company_name)} flex items-center justify-center text-white font-medium shrink-0`}>
                        {tenant.company_name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{tenant.company_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{tenant.contact_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{tenant.contact_phone}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">0</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {tenant.status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 glow-online">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        正常
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 glow-frozen">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        冻结
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(tenant.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(tenant)}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onViewLots(tenant)}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        title="查看车场"
                      >
                        <Warehouse className="w-4 h-4" />
                      </button>
                      {tenant.status === "active" ? (
                        <button
                          onClick={() => onFreeze(tenant)}
                          className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                          title="冻结"
                        >
                          <Snowflake className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onUnfreeze(tenant)}
                          className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors"
                          title="解冻"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > 0 && (
          <Pagination
            current={currentPage}
            total={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
}
