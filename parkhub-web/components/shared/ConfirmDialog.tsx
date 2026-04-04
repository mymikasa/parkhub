"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Snowflake, RotateCcw } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading: boolean;
  variant?: "default" | "destructive";
  entityLabel?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading,
  variant = "default",
  entityLabel,
}: ConfirmDialogProps) {
  const prevOpenRef = useRef(open);
  const [cachedData, setCachedData] = useState({
    title,
    description,
    variant,
  });

  if (open && !prevOpenRef.current) {
    setCachedData({ title, description, variant });
  }
  prevOpenRef.current = open;

  const isDestructive = cachedData.variant === "destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0"
        showCloseButton={false}
      >
        <div
          className={`px-6 py-5 ${
            isDestructive
              ? "bg-gradient-to-r from-red-500 to-red-600"
              : "bg-gradient-to-r from-emerald-500 to-emerald-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
              {isDestructive ? (
                <Snowflake className="text-white w-5 h-5" />
              ) : (
                <RotateCcw className="text-white w-5 h-5" />
              )}
            </div>
            <DialogTitle className="text-lg font-semibold text-white">
              {cachedData.title}
            </DialogTitle>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            {cachedData.description}
          </p>
          {isDestructive && entityLabel && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-600">
                冻结后该{entityLabel}将无法登录系统，所有操作权限将被暂停。此操作可随时撤销。
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
                ? "bg-red-500 hover:bg-red-600"
                : "bg-emerald-500 hover:bg-emerald-600"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                处理中...
              </span>
            ) : (
              "确认"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
