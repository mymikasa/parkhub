"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useUsers, useCreateUser, useUpdateUser, useFreezeUser, useUnfreezeUser, useResetPassword, useImportUsers } from "@/lib/user/hooks";
import type { CreateUserRequest, UpdateUserRequest } from "@/lib/user/types";
import { useTenants } from "@/lib/tenant/hooks";
import { usePermissions, useAuth } from "@/lib/auth/hooks";
import { Shield } from "lucide-react";
import { UserStatsCards } from "./_components/UserStatsCards";
import { UserTable } from "./_components/UserTable";
import { UserFormDialog } from "./_components/UserFormDialog";
import { EditUserDialog } from "./_components/EditUserDialog";
import { ResetPasswordDialog } from "./_components/ResetPasswordDialog";
import { ImportDialog } from "./_components/ImportDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function UserManagementPage() {
  const { canManageUsers, isPlatformAdmin } = usePermissions();
  const { user: currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState<"active" | "frozen" | "all">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<"freeze" | "unfreeze" | null>(null);

  const filter = {
    status: statusFilter,
    role: roleFilter,
    tenant_id: tenantFilter !== "all" ? tenantFilter : undefined,
    keyword: searchQuery,
    page: currentPage,
    page_size: PAGE_SIZE,
  };

  const { data: usersData, isLoading, refetch } = useUsers(filter);
  const { data: tenantsData } = useTenants({ page: 1, page_size: 100 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const freezeUser = useFreezeUser();
  const unfreezeUser = useUnfreezeUser();
  const resetPassword = useResetPassword();
  const importUsers = useImportUsers();

  const users = usersData?.items || [];
  const total = usersData?.total || 0;
  const tenants = tenantsData?.items || [];

  const stats = {
    total: usersData?.active_count != null ? (usersData.active_count + usersData.frozen_count) : total,
    active: usersData?.active_count ?? 0,
    frozen: usersData?.frozen_count ?? 0,
    tenant_admins: usersData?.admin_count ?? 0,
    operators: usersData?.operator_count ?? 0,
  };

  const handleCreate = async (data: CreateUserRequest) => { try { await createUser.mutate(data, () => { setIsCreateDialogOpen(false); refetch(); }); } catch {} };
  const handleUpdate = async (id: string, data: UpdateUserRequest) => { try { await updateUser.mutate(id, data, () => { setIsEditDialogOpen(false); setSelectedUser(null); refetch(); }); } catch {} };
  const handleFreeze = async (id: string) => { try { await freezeUser.mutate(id, () => { setIsConfirmDialogOpen(false); setSelectedUser(null); setConfirmAction(null); refetch(); }); } catch {} };
  const handleUnfreeze = async (id: string) => { try { await unfreezeUser.mutate(id, () => { setIsConfirmDialogOpen(false); setSelectedUser(null); setConfirmAction(null); refetch(); }); } catch {} };
  const handleResetPassword = async (id: string, newPassword: string) => { try { await resetPassword.mutate(id, { new_password: newPassword }, () => { setIsResetPasswordDialogOpen(false); setSelectedUser(null); }); } catch {} };
  const handleImport = async (jsonData: string) => { try { const parsed = JSON.parse(jsonData); await importUsers.mutate({ users: Array.isArray(parsed) ? parsed : [parsed] }, () => { setIsImportDialogOpen(false); refetch(); }); } catch {} };

  const openConfirmDialog = (user: any, action: "freeze" | "unfreeze") => {
    setSelectedUser(user);
    setConfirmAction(action);
    setIsConfirmDialogOpen(true);
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
      <Header title="用户管理" description="管理系统用户、角色分配与权限控制" />
      <UserStatsCards stats={stats} isLoading={isLoading} />
      <div className="px-8 pb-8">
        <UserTable users={users} tenants={tenants} isLoading={isLoading} total={total} currentPage={currentPage} pageSize={PAGE_SIZE}
          statusFilter={statusFilter} roleFilter={roleFilter} tenantFilter={tenantFilter} searchQuery={searchQuery} isPlatformAdmin={isPlatformAdmin}
          onStatusFilterChange={(v) => { setStatusFilter(v as any); setCurrentPage(1); }} onRoleFilterChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}
          onTenantFilterChange={(v) => { setTenantFilter(v); setCurrentPage(1); }} onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
          onPageChange={setCurrentPage} onEdit={(u) => { setSelectedUser(u); setIsEditDialogOpen(true); }}
          onResetPassword={(u) => { setSelectedUser(u); setIsResetPasswordDialogOpen(true); }}
          onFreeze={(u) => openConfirmDialog(u, "freeze")} onUnfreeze={(u) => openConfirmDialog(u, "unfreeze")}
          onCreateUser={() => setIsCreateDialogOpen(true)} onImportUsers={() => setIsImportDialogOpen(true)} />
      </div>
      <UserFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSubmit={handleCreate} tenants={tenants} isLoading={createUser.isPending} isPlatformAdmin={isPlatformAdmin} currentUserTenantId={currentUser?.tenant_id ?? undefined} />
      <EditUserDialog open={isEditDialogOpen} onOpenChange={(o) => { setIsEditDialogOpen(o); if (!o) setSelectedUser(null); }} onSubmit={(d) => selectedUser && handleUpdate(selectedUser.id, d)} initialData={selectedUser} isLoading={updateUser.isPending} />
      <ResetPasswordDialog open={isResetPasswordDialogOpen} onOpenChange={(o) => { setIsResetPasswordDialogOpen(o); if (!o) setSelectedUser(null); }} onSubmit={(p) => selectedUser && handleResetPassword(selectedUser.id, p)} username={selectedUser?.username || ""} isLoading={resetPassword.isPending} />
      <ConfirmDialog open={isConfirmDialogOpen} onOpenChange={(o) => { setIsConfirmDialogOpen(o); if (!o) { setSelectedUser(null); setConfirmAction(null); } }}
        title={confirmAction === "freeze" ? "确认冻结" : "确认解冻"}
        description={confirmAction === "freeze" ? `确定要冻结用户"${selectedUser?.real_name || selectedUser?.username}"吗？冻结后该用户将无法登录系统。` : `确定要解冻用户"${selectedUser?.real_name || selectedUser?.username}"吗？`}
        onConfirm={() => { if (selectedUser && confirmAction) { confirmAction === "freeze" ? handleFreeze(selectedUser.id) : handleUnfreeze(selectedUser.id); } }}
        isLoading={freezeUser.isPending || unfreezeUser.isPending} variant={confirmAction === "freeze" ? "destructive" : "default"} entityLabel="用户" />
      <ImportDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} onSubmit={handleImport} isLoading={importUsers.isPending} />
    </>
  );
}