'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from './store';
import type { User, UserRole } from './types';

// ──────────────────────────────────────────────
// useAuth – full auth context access
// ──────────────────────────────────────────────
export function useAuth() {
  return useAuthContext();
}

// ──────────────────────────────────────────────
// useUser – quick access to current user
// ──────────────────────────────────────────────
export function useUser(): User | null {
  const { user } = useAuthContext();
  return user;
}

// ──────────────────────────────────────────────
// usePermissions – role-based permission booleans
// ──────────────────────────────────────────────
export interface Permissions {
  canManageTenants: boolean;
  canManageParkingLots: boolean;
  canManageDevices: boolean;
  canManageBillingRules: boolean;
  canViewRealtimeMonitor: boolean;
  canViewEntryExitRecords: boolean;
  canAccessOperatorWorkspace: boolean;
  isPlatformAdmin: boolean;
  isTenantAdmin: boolean;
  isOperator: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  platform_admin: {
    canManageTenants: true,
    canManageParkingLots: true,
    canManageDevices: true,
    canManageBillingRules: true,
    canViewRealtimeMonitor: true,
    canViewEntryExitRecords: true,
    canAccessOperatorWorkspace: false,
    isPlatformAdmin: true,
    isTenantAdmin: false,
    isOperator: false,
  },
  tenant_admin: {
    canManageTenants: false,
    canManageParkingLots: true,
    canManageDevices: true,
    canManageBillingRules: true,
    canViewRealtimeMonitor: true,
    canViewEntryExitRecords: true,
    canAccessOperatorWorkspace: true,
    isPlatformAdmin: false,
    isTenantAdmin: true,
    isOperator: false,
  },
  operator: {
    canManageTenants: false,
    canManageParkingLots: false,
    canManageDevices: true,
    canManageBillingRules: false,
    canViewRealtimeMonitor: true,
    canViewEntryExitRecords: true,
    canAccessOperatorWorkspace: true,
    isPlatformAdmin: false,
    isTenantAdmin: false,
    isOperator: true,
  },
};

const EMPTY_PERMISSIONS: Permissions = {
  canManageTenants: false,
  canManageParkingLots: false,
  canManageDevices: false,
  canManageBillingRules: false,
  canViewRealtimeMonitor: false,
  canViewEntryExitRecords: false,
  canAccessOperatorWorkspace: false,
  isPlatformAdmin: false,
  isTenantAdmin: false,
  isOperator: false,
};

export function usePermissions(): Permissions {
  const { user } = useAuthContext();
  if (!user) return EMPTY_PERMISSIONS;
  return ROLE_PERMISSIONS[user.role] ?? EMPTY_PERMISSIONS;
}

// ──────────────────────────────────────────────
// useRequireAuth – redirect if not authenticated
// ──────────────────────────────────────────────
export function useRequireAuth(redirectTo = '/login'): User | null {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, router, redirectTo]);

  return user;
}
