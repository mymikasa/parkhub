"use client";

import { Icon } from "@/components/icons/FontAwesome";
import { faMagnifyingGlass, faDownload, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import type { FormFilters, ParkingLotOption } from "./helpers";

interface RecordFiltersProps {
  filters: FormFilters;
  parkingLots: ParkingLotOption[];
  onFiltersChange: (filters: FormFilters) => void;
  onApply: () => void;
  onReset: () => void;
  exportingFormat: string | null;
  isExportMenuOpen: boolean;
  onToggleExport: () => void;
  onExport: (format: "csv" | "xlsx") => void;
}

export function RecordFilters({
  filters,
  parkingLots,
  onFiltersChange,
  onApply,
  onReset,
  exportingFormat,
  isExportMenuOpen,
  onToggleExport,
  onExport,
}: RecordFiltersProps) {
  return (
    <div className="px-8 py-5 bg-white border-b border-surface-border">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">时间范围</span>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => onFiltersChange({ ...filters, start_date: e.target.value })}
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
          />
          <span className="text-gray-300">~</span>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => onFiltersChange({ ...filters, end_date: e.target.value })}
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="relative">
          <input
            type="text"
            value={filters.plate_number}
            onChange={(e) => onFiltersChange({ ...filters, plate_number: e.target.value })}
            placeholder="搜索车牌号..."
            className="w-48 h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
          />
          <Icon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        </div>
        <select
          value={filters.parking_lot_id}
          onChange={(e) => onFiltersChange({ ...filters, parking_lot_id: e.target.value })}
          className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-brand-500"
        >
          <option value="">全部车场</option>
          {parkingLots.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as FormFilters["type"] })}
          className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-brand-500"
        >
          <option value="all">全部类型</option>
          <option value="entry">入场</option>
          <option value="exit">出场</option>
        </select>
        <select
          value={filters.status_group}
          onChange={(e) => onFiltersChange({ ...filters, status_group: e.target.value as FormFilters["status_group"] })}
          className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-brand-500"
        >
          <option value="all">全部状态</option>
          <option value="normal">正常</option>
          <option value="exception">异常</option>
        </select>
        <button onClick={onApply} className="btn-primary h-9 px-4 rounded-lg text-white text-sm font-medium">查询</button>
        <button onClick={onReset} className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">重置</button>
      </div>
    </div>
  );
}
