"use client";

import { formatCount } from "./constants";

interface BatchActionsBarProps {
  selectedCount: number;
  canBatchEnable: boolean;
  canBatchDelete: boolean;
  canBatchBind: boolean;
  onBatchDisable: () => void;
  onBatchEnable: () => void;
  onBatchDelete: () => void;
  onBatchBind: () => void;
  onClearSelection: () => void;
  batchDisablePending: boolean;
  batchEnablePending: boolean;
  batchDeletePending: boolean;
  batchBindPending: boolean;
}

export function BatchActionsBar({
  selectedCount,
  canBatchEnable,
  canBatchDelete,
  canBatchBind,
  onBatchDisable,
  onBatchEnable,
  onBatchDelete,
  onBatchBind,
  onClearSelection,
  batchDisablePending,
  batchEnablePending,
  batchDeletePending,
  batchBindPending,
}: BatchActionsBarProps) {
  return (
    <div className="border-b border-surface-border bg-brand-50/40 px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-brand-700">
          已选择 {formatCount(selectedCount)} 台设备
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBatchDisable}
            disabled={batchDisablePending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            批量禁用
          </button>
          <button
            onClick={onBatchEnable}
            disabled={!canBatchEnable || batchEnablePending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            批量启用
          </button>
          <button
            onClick={onBatchBind}
            disabled={!canBatchBind || batchBindPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            批量绑定
          </button>
          <button
            onClick={onBatchDelete}
            disabled={!canBatchDelete || batchDeletePending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            批量删除
          </button>
          <button
            onClick={onClearSelection}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            取消选择
          </button>
        </div>
      </div>
    </div>
  );
}
