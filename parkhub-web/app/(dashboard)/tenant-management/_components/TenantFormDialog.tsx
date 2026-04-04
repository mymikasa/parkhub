"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2 } from "lucide-react";
import type { Tenant, CreateTenantRequest } from "@/lib/tenant/types";

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTenantRequest) => void;
  initialData?: Tenant | null;
  isLoading: boolean;
}

export function TenantFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: TenantFormDialogProps) {
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    contact_phone: "",
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
    setFormData({ company_name: "", contact_name: "", contact_phone: "" });
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
                {initialData ? "编辑租户" : "新建租户"}
              </DialogTitle>
              <p className="text-sm text-blue-100 mt-0.5">
                {initialData ? "修改租户的基本信息" : "填写租户信息以创建新租户"}
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
                  "保存修改"
                ) : (
                  "创建租户"
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
