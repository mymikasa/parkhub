"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

function generatePages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

interface PaginationProps {
  current: number;
  total: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({
  current,
  total,
  totalItems,
  pageSize,
  onChange,
}: PaginationProps) {
  const pages = generatePages(current, total);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500">
        显示 {from} - {to} 条，共 {formatCount(totalItems)} 条
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, current - 1))}
          disabled={current === 1}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((page, index) =>
          page === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-xs text-slate-400"
            >
              ···
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onChange(page)}
              className={`h-9 min-w-[2.25rem] rounded-xl px-2 text-sm font-medium transition-colors ${
                current === page
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-500/25"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onChange(Math.min(total, current + 1))}
          disabled={current === total}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
