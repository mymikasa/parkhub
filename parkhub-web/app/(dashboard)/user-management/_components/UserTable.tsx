'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Snowflake,
  RotateCcw,
  Key,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { User, UserStatus, UserRole } from '@/lib/user/types';
import { getAvatarGradient, ROLE_DISPLAY, ROLE_BADGE_CLASSES } from './constants';

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  statusFilter: UserStatus | 'all';
  roleFilter: UserRole | 'all';
  tenantFilter: string;
  isPlatformAdmin: boolean;
  tenants: Array<{ id: string; company_name: string }>;
  onStatusFilterChange: (status: UserStatus | 'all') => void;
  onRoleFilterChange: (role: UserRole | 'all') => void;
  onTenantFilterChange: (tenantId: string) => void;
  onPageChange: (page: number) => void;
  onEditUser: (user: User) => void;
  onResetPassword: (user: User) => void;
  onConfirmAction: (user: User, action: 'freeze' | 'unfreeze') => void;
  getTenantName: (tenantId?: string) => string;
}

function PaginationButtons({ currentPage, totalPages, onPageChange }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages: (number | '...')[] = [];

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
              currentPage === p
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        )
      )}
    </>
  );
}

export function UserTable({
  users,
  isLoading,
  total,
  currentPage,
  totalPages,
  pageSize,
  statusFilter,
  roleFilter,
  tenantFilter,
  isPlatformAdmin,
  tenants,
  onStatusFilterChange,
  onRoleFilterChange,
  onTenantFilterChange,
  onPageChange,
  onEditUser,
  onResetPassword,
  onConfirmAction,
  getTenantName,
}: UserTableProps) {
  return (
    <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
      {/* List header with tabs & filters */}
      <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-900">用户列表</span>
          {/* Status filter tabs */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([['all', '全部'], ['active', '活跃'], ['frozen', '冻结']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => onStatusFilterChange(value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  statusFilter === value
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Role filter */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([['all', '全部角色'], ['tenant_admin', '租户管理员'], ['operator', '操作员']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => onRoleFilterChange(value as UserRole | 'all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  roleFilter === value
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Tenant filter - only for platform_admin */}
          {isPlatformAdmin && (
            <Select value={tenantFilter} onValueChange={(value: string | null) => onTenantFilterChange(value ?? 'all')}>
              <SelectTrigger size="sm" className="w-40 border-gray-200 bg-white">
                <SelectValue placeholder="全部租户" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部租户</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {total} 条记录</span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/80">
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">用户信息</th>
            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">所属租户</th>
            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">最后登录</th>
            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div>
                      <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-16 bg-gray-100 rounded" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="w-16 h-6 bg-gray-200 rounded-full mx-auto" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
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
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-12 text-gray-500 text-sm">暂无用户数据</td>
            </tr>
          ) : (
            users.map((user: User) => (
              <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                {/* User info with avatar */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(user.username)} flex items-center justify-center text-white font-medium shrink-0`}>
                      {(user.real_name || user.username)[0]}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.real_name || user.username}</div>
                      <div className="text-xs text-gray-500 mt-0.5">@{user.username}</div>
                    </div>
                  </div>
                </td>
                {/* Role badge */}
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BADGE_CLASSES[user.role]}`}>
                    {ROLE_DISPLAY[user.role]}
                  </span>
                </td>
                {/* Tenant */}
                <td className="px-6 py-4 text-sm text-gray-600">
                  {getTenantName(user.tenant_id)}
                </td>
                {/* Status */}
                <td className="px-6 py-4 text-center">
                  {user.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 glow-online">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      活跃
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 glow-frozen">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      冻结
                    </span>
                  )}
                </td>
                {/* Last login */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
                    : '从未登录'}
                </td>
                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEditUser(user)}
                      className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onResetPassword(user)}
                      className="w-8 h-8 rounded-lg hover:bg-amber-50 flex items-center justify-center text-gray-400 hover:text-amber-600 transition-colors"
                      title="重置密码"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    {user.status === 'active' ? (
                      <button
                        onClick={() => onConfirmAction(user, 'freeze')}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                        title="冻结"
                      >
                        <Snowflake className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onConfirmAction(user, 'unfreeze')}
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

      {/* Pagination */}
      {total > 0 && (
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between">
          <div className="text-sm text-gray-500">
            显示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)} 条，共 {total} 条
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              title="上一页"
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <PaginationButtons currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              title="下一页"
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
