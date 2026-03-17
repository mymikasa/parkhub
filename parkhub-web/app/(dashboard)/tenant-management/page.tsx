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
  Building2,
  CheckCircle2,
  Snowflake,
  Warehouse,
  Pencil,
  RotateCcw,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useTenants, useCreateTenant, useUpdateTenant, useFreezeTenant, useUnfreezeTenant } from '@/lib/tenant/hooks';
import type { Tenant, TenantStatus, CreateTenantRequest, UpdateTenantRequest } from '@/lib/tenant/types';

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

export default function TenantManagementPage() {
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [confirmAction, setConfirmAction] = useState<'freeze' | 'unfreeze' | null>(null);

  const { data: tenantsData, isLoading, refetch } = useTenants({
    status: statusFilter,
    search: searchQuery,
    page: currentPage,
    page_size: PAGE_SIZE,
  });

  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const freezeTenant = useFreezeTenant();
  const unfreezeTenant = useUnfreezeTenant();

  const tenants = tenantsData?.items || [];
  const total = tenantsData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = {
    total: total,
    active: tenants.filter(t => t.status === 'active').length,
    frozen: tenants.filter(t => t.status === 'frozen').length,
    parking_lots: 0,
  };

  const handleCreate = async (data: CreateTenantRequest) => {
    try {
      await createTenant.mutate(data, () => {
        setIsCreateDialogOpen(false);
        refetch();
      });
    } catch (error) {
      console.error('Failed to create tenant:', error);
    }
  };

  const handleUpdate = async (id: string, data: UpdateTenantRequest) => {
    try {
      await updateTenant.mutate(id, data, () => {
        setIsEditDialogOpen(false);
        setSelectedTenant(null);
        refetch();
      });
    } catch (error) {
      console.error('Failed to update tenant:', error);
    }
  };

  const handleFreeze = async (id: string) => {
    try {
      await freezeTenant.mutate(id, () => {
        setIsConfirmDialogOpen(false);
        setSelectedTenant(null);
        setConfirmAction(null);
        refetch();
      });
    } catch (error) {
      console.error('Failed to freeze tenant:', error);
    }
  };

  const handleUnfreeze = async (id: string) => {
    try {
      await unfreezeTenant.mutate(id, () => {
        setIsConfirmDialogOpen(false);
        setSelectedTenant(null);
        setConfirmAction(null);
        refetch();
      });
    } catch (error) {
      console.error('Failed to unfreeze tenant:', error);
    }
  };

  const openConfirmDialog = (tenant: Tenant, action: 'freeze' | 'unfreeze') => {
    setSelectedTenant(tenant);
    setConfirmAction(action);
    setIsConfirmDialogOpen(true);
  };

  return (
    <>
      {/* Header with search & create */}
      <header className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">租户管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">管理平台所有租户及其停车场配置</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="搜索租户..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-64 h-10 pl-10 pr-4 rounded-lg border-gray-200 text-sm"
              />
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              新建租户
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-5">
          <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总租户数</p>
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 className="text-blue-600 w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs">
              <TrendingUp className="text-emerald-500 w-3.5 h-3.5" />
              <span className="text-emerald-600">+12%</span>
              <span className="text-gray-400">较上月</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">正常运营</p>
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-600 w-5 h-5" />
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
                <p className="text-sm text-gray-500">已冻结</p>
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.frozen}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <Snowflake className="text-red-500 w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs">
              <span className="text-gray-400">欠费或违规</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-surface-border card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">接入车场</p>
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.parking_lots}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
                <Warehouse className="text-violet-600 w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs">
              <span className="text-gray-400">平均 {!isLoading && stats.total > 0 ? (stats.parking_lots / stats.total).toFixed(1) : '-'} 个/租户</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant List */}
      <div className="px-8 pb-8">
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          {/* List header with tabs */}
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900">租户列表</span>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {([['all', '全部'], ['active', '正常'], ['frozen', '冻结']] as const).map(([value, label]) => (
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
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>共 {total} 条记录</span>
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
                    {/* Tenant info with avatar */}
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
                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{tenant.contact_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{tenant.contact_phone}</div>
                    </td>
                    {/* Parking lots */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">0</span>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      {tenant.status === 'active' ? (
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
                    {/* Date */}
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelectedTenant(tenant); setIsEditDialogOpen(true); }}
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                          title="查看车场"
                        >
                          <Warehouse className="w-4 h-4" />
                        </button>
                        {tenant.status === 'active' ? (
                          <button
                            onClick={() => openConfirmDialog(tenant, 'freeze')}
                            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                            title="冻结"
                          >
                            <Snowflake className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openConfirmDialog(tenant, 'unfreeze')}
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
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <PaginationButtons currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <TenantFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createTenant.isPending}
      />

      {/* Edit Dialog */}
      <TenantFormDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedTenant(null);
        }}
        onSubmit={(data) => selectedTenant && handleUpdate(selectedTenant.id, data)}
        initialData={selectedTenant}
        isLoading={updateTenant.isPending}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={isConfirmDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmDialogOpen(open);
          if (!open) { setSelectedTenant(null); setConfirmAction(null); }
        }}
        title={confirmAction === 'freeze' ? '确认冻结' : confirmAction === 'unfreeze' ? '确认解冻' : ''}
        description={
          confirmAction === 'freeze'
            ? `确定要冻结租户"${selectedTenant?.company_name}"吗？冻结后该租户将无法使用系统。`
            : confirmAction === 'unfreeze'
              ? `确定要解冻租户"${selectedTenant?.company_name}"吗？`
              : ''
        }
        onConfirm={() => {
          if (selectedTenant && confirmAction) {
            if (confirmAction === 'freeze') handleFreeze(selectedTenant.id);
            else handleUnfreeze(selectedTenant.id);
          }
        }}
        isLoading={freezeTenant.isPending || unfreezeTenant.isPending}
        variant={confirmAction === 'freeze' ? 'destructive' : 'default'}
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

function TenantFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTenantRequest) => void;
  initialData?: Tenant | null;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_phone: '',
  });

  const [lastInitialId, setLastInitialId] = useState<string | null>(null);
  if (open && initialData && initialData.id !== lastInitialId) {
    setFormData({
      company_name: initialData.company_name,
      contact_name: initialData.contact_name,
      contact_phone: initialData.contact_phone,
    });
    setLastInitialId(initialData.id);
  }
  if (open && !initialData && lastInitialId !== null) {
    setFormData({ company_name: '', contact_name: '', contact_phone: '' });
    setLastInitialId(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = formData.company_name.trim() && formData.contact_name.trim() && formData.contact_phone.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0" showCloseButton={false}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                {initialData ? '编辑租户' : '新建租户'}
              </DialogTitle>
              <p className="text-sm text-blue-100 mt-0.5">
                {initialData ? '修改租户的基本信息' : '填写租户信息以创建新租户'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                企业信息
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  公司名称 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="请输入公司全称，如：上海某某商业管理有限公司"
                    className="h-11 pl-10 pr-4 rounded-lg border-gray-200 text-sm bg-white"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                联系信息
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      联系人 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="姓名"
                      className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      联系电话 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="手机号"
                      className="h-11 px-4 rounded-lg border-gray-200 text-sm bg-white"
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  此联系信息将用于接收系统通知和账单提醒
                </p>
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
                ) : initialData ? (
                  '保存修改'
                ) : (
                  '创建租户'
                )}
              </button>
            </div>
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDestructive ? 'bg-white/20' : 'bg-white/20'}`}>
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
                冻结后该租户将无法登录系统，相关停车场服务也会暂停。此操作可随时撤销。
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
