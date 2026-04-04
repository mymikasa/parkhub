"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useTenants, useCreateTenant, useUpdateTenant, useFreezeTenant, useUnfreezeTenant } from "@/lib/tenant/hooks";
import type { Tenant, TenantStatus, CreateTenantRequest, UpdateTenantRequest } from "@/lib/tenant/types";
import { TenantStatsCards } from "./_components/TenantStatsCards";
import { TenantTable } from "./_components/TenantTable";
import { TenantFormDialog } from "./_components/TenantFormDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function TenantManagementPage() {
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [confirmAction, setConfirmAction] = useState<"freeze" | "unfreeze" | null>(null);

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

  const stats = {
    total,
    active: tenants.filter((t) => t.status === "active").length,
    frozen: tenants.filter((t) => t.status === "frozen").length,
    parking_lots: 0,
  };

  const handleCreate = async (data: CreateTenantRequest) => {
    try { await createTenant.mutate(data, () => { setIsCreateDialogOpen(false); refetch(); }); } catch {}
  };
  const handleUpdate = async (id: string, data: UpdateTenantRequest) => {
    try { await updateTenant.mutate(id, data, () => { setIsEditDialogOpen(false); setSelectedTenant(null); refetch(); }); } catch {}
  };
  const handleFreeze = async (id: string) => {
    try { await freezeTenant.mutate(id, () => { setIsConfirmDialogOpen(false); setSelectedTenant(null); setConfirmAction(null); refetch(); }); } catch {}
  };
  const handleUnfreeze = async (id: string) => {
    try { await unfreezeTenant.mutate(id, () => { setIsConfirmDialogOpen(false); setSelectedTenant(null); setConfirmAction(null); refetch(); }); } catch {}
  };

  const openConfirmDialog = (tenant: Tenant, action: "freeze" | "unfreeze") => {
    setSelectedTenant(tenant);
    setConfirmAction(action);
    setIsConfirmDialogOpen(true);
  };

  return (
    <>
      <Header title="租户管理" description="管理平台所有租户及其停车场配置" />
      <TenantStatsCards stats={stats} isLoading={isLoading} />
      <TenantTable
        tenants={tenants} isLoading={isLoading} total={total} currentPage={currentPage} pageSize={PAGE_SIZE}
        statusFilter={statusFilter} searchQuery={searchQuery}
        onStatusFilterChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
        onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
        onPageChange={setCurrentPage}
        onEdit={(t) => { setSelectedTenant(t); setIsEditDialogOpen(true); }}
        onViewLots={() => {}}
        onFreeze={(t) => openConfirmDialog(t, "freeze")}
        onUnfreeze={(t) => openConfirmDialog(t, "unfreeze")}
        onCreateTenant={() => setIsCreateDialogOpen(true)}
      />
      <TenantFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSubmit={handleCreate} isLoading={createTenant.isPending} />
      <TenantFormDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setSelectedTenant(null); }}
        onSubmit={(data) => selectedTenant && handleUpdate(selectedTenant.id, data)}
        initialData={selectedTenant}
        isLoading={updateTenant.isPending}
      />
      <ConfirmDialog
        open={isConfirmDialogOpen}
        onOpenChange={(open) => { setIsConfirmDialogOpen(open); if (!open) { setSelectedTenant(null); setConfirmAction(null); } }}
        title={confirmAction === "freeze" ? "确认冻结" : "确认解冻"}
        description={confirmAction === "freeze" ? `确定要冻结租户"${selectedTenant?.company_name}"吗？冻结后该租户将无法使用系统。` : `确定要解冻租户"${selectedTenant?.company_name}"吗？`}
        onConfirm={() => { if (selectedTenant && confirmAction) { if (confirmAction === "freeze") handleFreeze(selectedTenant.id); else handleUnfreeze(selectedTenant.id); } }}
        isLoading={freezeTenant.isPending || unfreezeTenant.isPending}
        variant={confirmAction === "freeze" ? "destructive" : "default"}
        entityLabel="租户"
      />
    </>
  );
}
