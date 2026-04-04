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
import { Key } from "lucide-react";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (newPassword: string) => void;
  username: string;
  isLoading: boolean;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  username,
  isLoading,
}: ResetPasswordDialogProps) {
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
