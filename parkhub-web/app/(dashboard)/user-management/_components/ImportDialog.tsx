'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (jsonData: string) => void;
  isLoading: boolean;
}

export function ImportDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ImportDialogProps) {
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
