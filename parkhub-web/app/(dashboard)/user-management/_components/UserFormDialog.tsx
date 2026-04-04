'use client';

import { useState } from 'react';
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
import { UserPlus } from "lucide-react";
import type { UserRole, CreateUserRequest } from '@/lib/user/types';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserRequest) => void;
  tenants: Array<{ id: string; company_name: string }>;
  isLoading: boolean;
  isPlatformAdmin: boolean;
  currentUserTenantId?: string;
}

export function UserFormDialog({
  open,
  onOpenChange,
  onSubmit,
  tenants,
  isLoading,
  isPlatformAdmin,
  currentUserTenantId,
}: UserFormDialogProps) {
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
