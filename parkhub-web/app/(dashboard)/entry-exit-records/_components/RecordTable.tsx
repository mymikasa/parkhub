"use client";

import { Icon } from "@/components/icons/FontAwesome";
import {
  faArrowRightFromBracket,
  faArrowRightToBracket,
  faCamera,
  faCircleCheck,
  faDownload,
  faQuestion,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { Pagination } from "@/components/shared/Pagination";
import type { TransitRecord, TransitStatus, TransitType } from "@/lib/transit-record/types";
import { formatDateTimeParts, formatCurrency, isExceptionStatus, buildPageItems } from "./helpers";

function renderStatusBadge(status: TransitStatus) {
  if (status === "paid") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700"><Icon icon={faCircleCheck} className="text-[10px]" />已缴费</span>;
  if (status === "no_exit") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700"><Icon icon={faTriangleExclamation} className="text-[10px]" />有入无出</span>;
  if (status === "no_entry") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700"><Icon icon={faQuestion} className="text-[10px]" />有出无入</span>;
  if (status === "recognition_failed") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700"><Icon icon={faCamera} className="text-[10px]" />识别失败</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">正常</span>;
}

function renderTypeBadge(type: TransitType) {
  if (type === "entry") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700"><Icon icon={faArrowRightToBracket} className="text-[10px]" />入场</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"><Icon icon={faArrowRightFromBracket} className="text-[10px]" />出场</span>;
}

interface RecordTableProps {
  records: TransitRecord[];
  isLoading: boolean;
  loadFailed: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onOpenDetail: (recordId: string) => void;
  onOpenException: (record: TransitRecord) => void;
}

export function RecordTable({
  records,
  isLoading,
  loadFailed,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onOpenDetail,
  onOpenException,
}: RecordTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const displayStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const displayEnd = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

  return (
    <div className="px-8 py-6">
      <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">车牌号</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">车场</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">出入口</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">费用</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && Array.from({ length: pageSize }).map((_, index) => (
              <tr key={index}><td className="px-6 py-4" colSpan={8}><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
            ))}
            {!isLoading && records.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-16 text-center text-sm text-gray-400">{loadFailed ? "加载失败，请调整筛选后重试" : "暂无符合条件的出入记录"}</td></tr>
            )}
            {!isLoading && records.map((record) => {
              const { date, time } = formatDateTimeParts(record.created_at);
              const exception = isExceptionStatus(record.status);
              const rowTint = record.status === "recognition_failed" ? "bg-amber-50/30" : record.status === "no_exit" || record.status === "no_entry" ? "bg-red-50/30" : "";
              const plateColor = record.status === "recognition_failed" ? "text-amber-600" : "text-gray-900";
              const isResolvedException = exception && Boolean(record.resolved_at);

              return (
                <tr key={record.id} className={`transition-colors hover:bg-gray-50 ${rowTint}`}>
                  <td className="px-6 py-4"><div className="text-sm text-gray-900">{time}</div><div className="text-xs text-gray-400">{date}</div></td>
                  <td className="px-6 py-4"><span className={`font-mono font-bold ${plateColor}`}>{record.plate_number ?? "--"}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.parking_lot_name || "--"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.gate_name || "--"}</td>
                  <td className="px-6 py-4 text-center">{renderTypeBadge(record.type)}</td>
                  <td className={`px-6 py-4 text-center text-sm ${record.fee === null ? "text-gray-400" : "font-medium text-emerald-600"}`}>{formatCurrency(record.fee)}</td>
                  <td className="px-6 py-4 text-center">{renderStatusBadge(record.status)}</td>
                  <td className="px-6 py-4 text-center">
                    {!exception || isResolvedException ? (
                      <button onClick={() => onOpenDetail(record.id)} className="text-sm text-brand-600 hover:text-brand-700">详情</button>
                    ) : (
                      <button onClick={() => onOpenException(record)} className={`text-sm font-medium ${record.status === "recognition_failed" ? "text-amber-600 hover:text-amber-700" : "text-red-600 hover:text-red-700"}`}>
                        {record.status === "recognition_failed" ? "补录" : "处理"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {total > 0 && (
          <Pagination current={currentPage} total={totalPages} totalItems={total} pageSize={pageSize} onChange={onPageChange} />
        )}
      </div>
    </div>
  );
}
