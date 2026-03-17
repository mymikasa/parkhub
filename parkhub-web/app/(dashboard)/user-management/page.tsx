'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Pencil,
  Snowflake,
  RotateCcw,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Key,
  Upload,
  UserPlus,
} from "lucide-react";
import { useUsers, useCreateUser, useUpdateUser, useFreezeUser, useUnfreezeUser, useResetPassword, useImportUsers } from '@/lib/user/hooks';
import type { User, UserStatus, UserRole, UserFilter, CreateUserRequest, UpdateUserRequest } from '@/lib/user/types';
import { useTenants } from '@/lib/tenant/hooks';
import { usePermissions, useAuth } from '@/lib/auth/hooks';

// Avatar gradient colors by first character hash
const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
  'from-indigo-500 to-indigo-600',
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

const ROLE_DISPLAY: Record<UserRole, string> = {
  platform_admin: '平台管理员',
  tenant_admin: '租户管理员',
  operator: '操作员',
};

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  platform_admin: 'bg-purple-50 text-purple-700',
  tenant_admin: 'bg-blue-50 text-blue-700',
  operator: 'bg-gray-100 text-gray-700',
};

export default function UserManagementPage() {
  const { canManageUsers, isPlatformAdmin } = usePermissions();
  const { user: currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<'freeze' | 'unfreeze' | null>(null);

  const filter: UserFilter = {
    status: statusFilter,
    role: roleFilter,
    tenant_id: tenantFilter !== 'all' ? tenantFilter : undefined,
    keyword: searchQuery,
    page: currentPage,
    page_size: PAGE_SIZE,
  };

  const { data: usersData, isLoading, refetch } = useUsers(filter);
  // Only platform_admin can access the tenants API; tenant_admin uses their own tenant_id
  const { data: tenantsData } = useTenants({ page: 1, page_size: 100 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const freezeUser = useFreezeUser();
  const unfreezeUser = useUnfreezeUser();
  const resetPassword = useResetPassword();
  const importUsers = useImportUsers();

  const users = usersData?.items || [];
  const total = usersData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tenants = tenantsData?.items || [];

  const stats = {
    total: usersData?.active_count != null ? (usersData.active_count + usersData.frozen_count) : total,
    active: usersData?.active_count ?? 0,
    frozen: usersData?.frozen_count ?? 0,
    tenant_admins: usersData?.admin_count ?? 0,
    operators: usersData?.operator_count ?? 0,
  };

  const handleCreate = async (data: CreateUserRequest) => {
    try {
      await createUser.mutate(data, () => {
        setIsCreateDialogOpen(false);
        refetch();
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdate = async (id: string, data: UpdateUserRequest) => {
    try {
      await updateUser.mutate(id, data, () => {
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        refetch();
      });
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleFreeze = async (id: string) => {
    try {
      await freezeUser.mutate(id, () => {
        setIsConfirmDialogOpen(false);
        setSelectedUser(null);
        setConfirmAction(null);
        refetch();
      });
    } catch (error) {
      console.error('Failed to freeze user:', error);
    }
  };

  const handleUnfreeze = async (id: string) => {
    try {
      await unfreezeUser.mutate(id, () => {
        setIsConfirmDialogOpen(false);
        setSelectedUser(null);
        setConfirmAction(null);
        refetch();
      });
    } catch (error) {
      console.error('Failed to unfreeze user:', error);
    }
  };

  const handleResetPassword = async (id: string, newPassword: string) => {
    try {
      await resetPassword.mutate(id, { new_password: newPassword }, () => {
        setIsResetPasswordDialogOpen(false);
        setSelectedUser(null);
      });
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  };

  const handleImport = async (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      const req = { users: Array.isArray(parsed) ? parsed : [parsed] };
      await importUsers.mutate(req, () => {
        setIsImportDialogOpen(false);
        refetch();
      });
    } catch (error) {
      console.error('Failed to import users:', error);
    }
  };

  const openConfirmDialog = (user: User, action: 'freeze' | 'unfreeze') => {
    setSelectedUser(user);
    setConfirmAction(action);
    setIsConfirmDialogOpen(true);
  };

  const getTenantName = (tenantId?: string) => {
    if (!tenantId) return '-';
    const tenant = tenants.find((t) => t.id === tenantId);
    return tenant?.company_name || tenantId;
  };

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">您没有用户管理权限</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header with search & create */}
      <header className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">用户管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">管理系统用户、角色分配与权限控制</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="搜索用户..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-64 h-10 pl-10 pr-4 rounded-lg border-gray-200 text-sm"
              />
            </div>
            <button
              onClick={() => setIsImportDialogOpen(true)}
              className="h-10 px-4 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              导入用户
            </button>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              新建用户
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-8 py-6">
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
      </div>

      {/* User List */}
      <div className="px-8 pb-8">
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
                    onClick={() => { setStatusFilter(value); setCurrentPage(1); }}
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
                    onClick={() => { setRoleFilter(value as UserRole | 'all'); setCurrentPage(1); }}
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
                <Select value={tenantFilter} onValueChange={(value: string | null) => { setTenantFilter(value ?? 'all'); setCurrentPage(1); }}>
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
                          onClick={() => { setSelectedUser(user); setIsEditDialogOpen(true); }}
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setIsResetPasswordDialogOpen(true); }}
                          className="w-8 h-8 rounded-lg hover:bg-amber-50 flex items-center justify-center text-gray-400 hover:text-amber-600 transition-colors"
                          title="重置密码"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => openConfirmDialog(user, 'freeze')}
                            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                            title="冻结"
                          >
                            <Snowflake className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openConfirmDialog(user, 'unfreeze')}
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
                显示 {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, total)} 条，共 {total} 条
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="上一页"
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <PaginationButtons currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
      </div>

      {/* Create User Dialog */}
      <UserFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        tenants={tenants}
        isLoading={createUser.isPending}
        isPlatformAdmin={isPlatformAdmin}
        currentUserTenantId={currentUser?.tenant_id ?? undefined}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        onSubmit={(data) => selectedUser && handleUpdate(selectedUser.id, data)}
        initialData={selectedUser}
        isLoading={updateUser.isPending}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={isResetPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsResetPasswordDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        onSubmit={(newPassword) => selectedUser && handleResetPassword(selectedUser.id, newPassword)}
        username={selectedUser?.username || ''}
        isLoading={resetPassword.isPending}
      />

      {/* Confirm Dialog (Freeze/Unfreeze) */}
      <ConfirmDialog
        open={isConfirmDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmDialogOpen(open);
          if (!open) { setSelectedUser(null); setConfirmAction(null); }
        }}
        title={confirmAction === 'freeze' ? '确认冻结' : confirmAction === 'unfreeze' ? '确认解冻' : ''}
        description={
          confirmAction === 'freeze'
            ? `确定要冻结用户"${selectedUser?.real_name || selectedUser?.username}"吗？冻结后该用户将无法登录系统。`
            : confirmAction === 'unfreeze'
              ? `确定要解冻用户"${selectedUser?.real_name || selectedUser?.username}"吗？`
              : ''
        }
        onConfirm={() => {
          if (selectedUser && confirmAction) {
            if (confirmAction === 'freeze') handleFreeze(selectedUser.id);
            else handleUnfreeze(selectedUser.id);
          }
        }}
        isLoading={freezeUser.isPending || unfreezeUser.isPending}
        variant={confirmAction === 'freeze' ? 'destructive' : 'default'}
      />

      {/* Import Users Dialog */}
      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSubmit={handleImport}
        isLoading={importUsers.isPending}
      />
    </>
  );
}

/* ─── Pagination ─── */
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

/* ─── Create User Dialog ─── */
function UserFormDialog({
  open,
  onOpenChange,
  onSubmit,
  tenants,
  isLoading,
  isPlatformAdmin,
  currentUserTenantId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserRequest) => void;
  tenants: Array<{ id: string; company_name: string }>;
  isLoading: boolean;
  isPlatformAdmin: boolean;
  currentUserTenantId?: string;
}) {
  // tenant_admin: auto-set tenant_id to their own tenant, only allow creating operators
  const defaultTenantId = isPlatformAdmin ? '' : (currentUserTenantId ?? '');
  const defaultRole = isPlatformAdmin ? 'operator' : 'operator';

  const [formData, setFormData] = useState<CreateUserRequest>({
    username: '',
    real_name: '',
    password: '',
    role: defaultRole,
    tenant_id: defaultTenantId,
    email: '',
    phone: '',
  });

  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setFormData({
      username: '',
      real_name: '',
      password: '',
      role: defaultRole,
      tenant_id: defaultTenantId,
      email: '',
      phone: '',
    });
    setLastOpen(true);
  }
  if (!open && lastOpen) {
    setLastOpen(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = formData.username.trim() && formData.real_name.trim() && formData.password.trim() && !!formData.tenant_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0" showCloseButton={false}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <UserPlus className="text-white w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                新建用户
              </DialogTitle>
              <p className="text-sm text-blue-100 mt-0.5">
                填写用户信息以创建新账户
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Account info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                账户信息
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      用户名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="登录账号，如：zhangsan"
                      className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      密码 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="至少8位，含大小写字母和数字"
                      className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personal info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                个人信息
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      真实姓名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.real_name}
                      onChange={(e) => setFormData({ ...formData, real_name: e.target.value })}
                      placeholder="用户姓名"
                      className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      手机号码
                    </Label>
                    <Input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="手机号"
                      className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱地址
                  </Label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Role & tenant */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <div className="w-1 h-4 bg-violet-500 rounded-full" />
                角色与租户
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      角色 <span className="text-red-500">*</span>
                    </Label>
                    {isPlatformAdmin ? (
                      <Select value={formData.role} onValueChange={(value) => value && setFormData({ ...formData, role: value as UserRole })}>
                        <SelectTrigger className="h-11 w-full rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                          <SelectValue placeholder="选择角色" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant_admin">租户管理员</SelectItem>
                          <SelectItem value="operator">操作员</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value="操作员" disabled className="h-11 rounded-lg border-gray-200 bg-gray-50 text-sm" />
                    )}
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      所属租户 <span className="text-red-500">*</span>
                    </Label>
                    {isPlatformAdmin ? (
                      <Select value={formData.tenant_id} onValueChange={(value) => value && setFormData({ ...formData, tenant_id: value })}>
                        <SelectTrigger className="h-11 w-full rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                          <SelectValue placeholder="选择租户" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value="当前租户" disabled className="h-11 rounded-lg border-gray-200 bg-gray-50 text-sm" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-surface-border flex items-center justify-between">
            <p className="text-xs text-gray-400">
              <span className="text-red-500">*</span> 为必填字段
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 px-5 rounded-lg border-gray-200 hover:bg-gray-100"
              >
                取消
              </Button>
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="btn-primary h-10 px-6 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    处理中...
                  </span>
                ) : (
                  '创建用户'
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Edit User Dialog ─── */
function EditUserDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateUserRequest) => void;
  initialData: User | null;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<UpdateUserRequest>({
    real_name: '',
    email: '',
    phone: '',
    role: 'operator',
  });

  const [lastInitialId, setLastInitialId] = useState<string | null>(null);
  if (open && initialData && initialData.id !== lastInitialId) {
    setFormData({
      real_name: initialData.real_name || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      role: initialData.role,
    });
    setLastInitialId(initialData.id);
  }
  if (open && !initialData && lastInitialId !== null) {
    setFormData({ real_name: '', email: '', phone: '', role: 'operator' });
    setLastInitialId(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = formData.real_name?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0" showCloseButton={false}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Pencil className="text-white w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                编辑用户
              </DialogTitle>
              <p className="text-sm text-blue-100 mt-0.5">
                修改用户 @{initialData?.username} 的基本信息
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                个人信息
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      真实姓名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.real_name || ''}
                      onChange={(e) => setFormData({ ...formData, real_name: e.target.value })}
                      placeholder="用户姓名"
                      className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      手机号码
                    </Label>
                    <Input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="手机号"
                      className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱地址
                  </Label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <div className="w-1 h-4 bg-violet-500 rounded-full" />
                角色设置
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  角色
                </Label>
                <Select value={formData.role} onValueChange={(value) => value && setFormData({ ...formData, role: value as UserRole })}>
                  <SelectTrigger className="h-11 w-full border-gray-200 bg-white hover:border-gray-300 focus:border-blue-500">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_admin">租户管理员</SelectItem>
                    <SelectItem value="operator">操作员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-surface-border flex items-center justify-between">
            <p className="text-xs text-gray-400">
              <span className="text-red-500">*</span> 为必填字段
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 px-5 rounded-lg border-gray-200 hover:bg-gray-100"
              >
                取消
              </Button>
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="btn-primary h-10 px-6 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    处理中...
                  </span>
                ) : (
                  '保存修改'
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Reset Password Dialog ─── */
function ResetPasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  username,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (newPassword: string) => void;
  username: string;
  isLoading: boolean;
}) {
  const [newPassword, setNewPassword] = useState('');

  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setNewPassword('');
    setLastOpen(true);
  }
  if (!open && lastOpen) {
    setLastOpen(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(newPassword);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0" showCloseButton={false}>
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Key className="text-white w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                重置密码
              </DialogTitle>
              <p className="text-sm text-amber-100 mt-0.5">
                为用户 @{username} 设置新密码
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                新密码 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少8位，含大小写字母和数字"
                className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                required
              />
              <p className="text-xs text-gray-400 mt-3">
                密码重置后用户需要使用新密码登录，建议及时通知用户
              </p>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 rounded-lg border-gray-200 hover:bg-gray-100"
            >
              取消
            </Button>
            <button
              type="submit"
              disabled={isLoading || !newPassword.trim()}
              className="h-10 px-5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  处理中...
                </span>
              ) : (
                '确认重置'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Confirm Dialog ─── */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading,
  variant = 'default',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading: boolean;
  variant?: 'default' | 'destructive';
}) {
  const [cachedData, setCachedData] = useState({ title, description, variant });

  useEffect(() => {
    if (open) {
      setCachedData({ title, description, variant });
    }
  }, [open, title, description, variant]);

  const isDestructive = cachedData.variant === 'destructive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0" showCloseButton={false}>
        <div className={`px-6 py-5 ${isDestructive ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
              {isDestructive ? <Snowflake className="text-white w-5 h-5" /> : <RotateCcw className="text-white w-5 h-5" />}
            </div>
            <DialogTitle className="text-lg font-semibold text-white">
              {cachedData.title}
            </DialogTitle>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 leading-relaxed">{cachedData.description}</p>
          {isDestructive && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-600">
                冻结后该用户将无法登录系统，所有操作权限将被暂停。此操作可随时撤销。
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 rounded-lg border-gray-200 hover:bg-gray-100"
          >
            取消
          </Button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`h-10 px-5 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 ${
              isDestructive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                处理中...
              </span>
            ) : (
              '确认'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Import Users Dialog ─── */
function ImportDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (jsonData: string) => void;
  isLoading: boolean;
}) {
  const [jsonText, setJsonText] = useState('');

  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setJsonText('');
    setLastOpen(true);
  }
  if (!open && lastOpen) {
    setLastOpen(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(jsonText);
  };

  const isValid = (() => {
    try {
      if (!jsonText.trim()) return false;
      JSON.parse(jsonText);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0" showCloseButton={false}>
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Upload className="text-white w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                批量导入用户
              </DialogTitle>
              <p className="text-sm text-violet-100 mt-0.5">
                通过 JSON 数据批量创建用户账户
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                JSON 数据 <span className="text-red-500">*</span>
              </Label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={`[\n  {\n    "username": "zhangsan",\n    "real_name": "张三",\n    "password": "Zhang@123456",\n    "role": "operator",\n    "tenant_id": "tenant-uuid",\n    "email": "zhangsan@example.com",\n    "phone": "13800138001"\n  }\n]`}
                className="w-full h-56 px-4 py-3 rounded-lg border border-gray-200 text-sm bg-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                required
              />
              <p className="text-xs text-gray-400 mt-3">
                请输入符合格式的 JSON 数组，每个对象包含 username、real_name、password、role、tenant_id 字段
              </p>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 rounded-lg border-gray-200 hover:bg-gray-100"
            >
              取消
            </Button>
            <button
              type="submit"
              disabled={isLoading || !isValid}
              className="h-10 px-5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  导入中...
                </span>
              ) : (
                '确认导入'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
