"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icons/FontAwesome";
import {
  faArrowRightFromBracket,
  faArrowRightToBracket,
  faCamera,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faDownload,
  faMagnifyingGlass,
  faQuestion,
  faTriangleExclamation,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { getValidAccessToken } from "@/lib/auth/store";
import { getParkingLots, getGates } from "@/lib/parking-lot/api";
import {
  exportTransitRecords,
  getTransitExceptionSummary,
  getTransitRecord,
  getTransitRecords,
  resolveTransitRecord,
} from "@/lib/transit-record/api";
import type {
  TransitRecord,
  TransitRecordFilter,
  TransitStatus,
  TransitStatusGroup,
  TransitType,
} from "@/lib/transit-record/types";

interface FormFilters {
  start_date: string;
  end_date: string;
  plate_number: string;
  parking_lot_id: string;
  type: "all" | TransitType;
  status_group: TransitStatusGroup;
}

interface ParkingLotOption {
  id: string;
  name: string;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toStartOfDayRFC3339(date: string): string | undefined {
  if (!date) {
    return undefined;
  }
  return new Date(`${date}T00:00:00`).toISOString();
}

function toEndOfDayRFC3339(date: string): string | undefined {
  if (!date) {
    return undefined;
  }
  return new Date(`${date}T23:59:59`).toISOString();
}

function formatDateTimeParts(value: string): { date: string; time: string } {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { date: "--", time: "--:--:--" };
  }
  const date = d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("zh-CN", {
    hour12: false,
  });
  return { date, time };
}

function formatCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }
  return `¥${value.toFixed(2)}`;
}

function isExceptionStatus(status: TransitStatus): boolean {
  return status === "no_exit" || status === "no_entry" || status === "recognition_failed";
}

function statusText(status: TransitStatus): string {
  switch (status) {
    case "normal":
      return "正常";
    case "paid":
      return "已缴费";
    case "no_exit":
      return "有入无出";
    case "no_entry":
      return "有出无入";
    case "recognition_failed":
      return "识别失败";
    default:
      return status;
  }
}

function exceptionHint(status: TransitStatus): string {
  if (status === "recognition_failed") {
    return "车牌识别失败，请手动补录车牌号";
  }
  if (status === "no_entry") {
    return "未找到匹配入场记录，请核对并补录车牌号";
  }
  return "检测到异常停放记录，请核对并补录车牌号";
}

function typeText(type: TransitType): string {
  return type === "entry" ? "入场" : "出场";
}

function buildBaseFilter(filters: FormFilters): Omit<TransitRecordFilter, "page" | "page_size" | "status"> {
  return {
    parking_lot_id: filters.parking_lot_id || undefined,
    plate_number: filters.plate_number.trim() || undefined,
    type: filters.type === "all" ? undefined : filters.type,
    status_group: filters.status_group === "all" ? undefined : filters.status_group,
    start_date: toStartOfDayRFC3339(filters.start_date),
    end_date: toEndOfDayRFC3339(filters.end_date),
  };
}

function buildPageItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

export default function EntryExitRecordsPage() {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const defaultFilters = useMemo<FormFilters>(
    () => ({
      start_date: today,
      end_date: today,
      plate_number: "",
      parking_lot_id: "",
      type: "all",
      status_group: "all",
    }),
    [today]
  );

  const pageSize = 8;

  const [filters, setFilters] = useState<FormFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FormFilters>(defaultFilters);
  const [page, setPage] = useState(1);

  const [parkingLots, setParkingLots] = useState<ParkingLotOption[]>([]);
  const [records, setRecords] = useState<TransitRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState({
    no_exit: 0,
    no_entry: 0,
    recognition_failed: 0,
    total: 0,
  });
  const [loadFailed, setLoadFailed] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<TransitRecord | null>(null);
  const [detailDeviceSerial, setDetailDeviceSerial] = useState<string>("--");

  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionRecord, setExceptionRecord] = useState<TransitRecord | null>(null);
  const [resolvePlateNumber, setResolvePlateNumber] = useState("");
  const [resolveRemark, setResolveRemark] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"csv" | "xlsx" | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);
  const displayStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const displayEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const baseFilter = useMemo(() => buildBaseFilter(appliedFilters), [appliedFilters]);

  const loadParkingLotOptions = useCallback(async () => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return;
    }
    try {
      const result = await getParkingLots({ page: 1, page_size: 1000 }, accessToken);
      setParkingLots(result.items.map((item) => ({ id: item.id, name: item.name })));
    } catch {
      toast.error("车场列表加载失败");
    }
  }, []);

  const loadData = useCallback(async () => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      setLoadFailed(true);
      return;
    }

    setIsLoading(true);
    setLoadFailed(false);

    try {
      const [list, exceptionSummary] = await Promise.all([
        getTransitRecords(
          {
            ...baseFilter,
            page,
            page_size: pageSize,
          },
          accessToken
        ),
        getTransitExceptionSummary(baseFilter, accessToken),
      ]);

      setRecords(list.items);
      setTotal(list.total);
      setSummary(exceptionSummary);

      const latestPage = Math.max(1, Math.ceil(list.total / pageSize));
      if (page > latestPage) {
        setPage(latestPage);
      }
    } catch (error) {
      setLoadFailed(true);
      setRecords([]);
      setTotal(0);
      setSummary({
        no_exit: 0,
        no_entry: 0,
        recognition_failed: 0,
        total: 0,
      });
      const message = error instanceof Error ? error.message : "加载出入记录失败";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [baseFilter, page]);

  useEffect(() => {
    void loadParkingLotOptions();
  }, [loadParkingLotOptions]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (isDetailModalOpen || isExceptionModalOpen) {
      document.body.style.overflow = "hidden";
      return;
    }
    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDetailModalOpen, isExceptionModalOpen]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      ...filters,
      plate_number: filters.plate_number.trim(),
    });
    setIsExportMenuOpen(false);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
    setIsExportMenuOpen(false);
  };

  const showExceptionRecords = () => {
    const next = {
      ...appliedFilters,
      status_group: "exception" as TransitStatusGroup,
    };
    setFilters(next);
    setAppliedFilters(next);
    setPage(1);
  };

  const openDetailModal = async (recordId: string) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return;
    }

    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    setDetailRecord(null);
    setDetailDeviceSerial("--");

    try {
      const record = await getTransitRecord(recordId, accessToken);
      setDetailRecord(record);

      if (record.parking_lot_id) {
        try {
          const gates = await getGates(record.parking_lot_id, accessToken);
          const gate = gates.find((item) => item.id === record.gate_id);
          setDetailDeviceSerial(gate?.device?.serial_number ?? "--");
        } catch {
          setDetailDeviceSerial("--");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载详情失败";
      toast.error(message);
      setIsDetailModalOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openExceptionModal = (record: TransitRecord) => {
    setExceptionRecord(record);
    setResolvePlateNumber(record.plate_number ?? "");
    setResolveRemark(record.remark ?? "");
    setIsExceptionModalOpen(true);
  };

  const submitExceptionResolve = async () => {
    if (!exceptionRecord) {
      return;
    }

    const plate = resolvePlateNumber.trim();
    if (!plate) {
      toast.error("请输入补录车牌号");
      return;
    }

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return;
    }

    setIsResolving(true);
    try {
      await resolveTransitRecord(
        exceptionRecord.id,
        {
          plate_number: plate,
          remark: resolveRemark.trim() || undefined,
        },
        accessToken
      );
      toast.success("异常记录处理成功");
      setIsExceptionModalOpen(false);
      setExceptionRecord(null);
      setResolvePlateNumber("");
      setResolveRemark("");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "处理失败";
      toast.error(message);
    } finally {
      setIsResolving(false);
    }
  };

  const doExport = async (format: "csv" | "xlsx") => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return;
    }

    setExportingFormat(format);
    try {
      const { blob, filename } = await exportTransitRecords(baseFilter, format, accessToken);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`已开始下载 ${format.toUpperCase()} 文件`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败";
      toast.error(message);
    } finally {
      setExportingFormat(null);
      setIsExportMenuOpen(false);
    }
  };

  const renderStatusBadge = (status: TransitStatus) => {
    if (status === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
          <Icon icon={faCircleCheck} className="text-[10px]" />
          已缴费
        </span>
      );
    }
    if (status === "no_exit") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
          <Icon icon={faTriangleExclamation} className="text-[10px]" />
          有入无出
        </span>
      );
    }
    if (status === "no_entry") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
          <Icon icon={faQuestion} className="text-[10px]" />
          有出无入
        </span>
      );
    }
    if (status === "recognition_failed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
          <Icon icon={faCamera} className="text-[10px]" />
          识别失败
        </span>
      );
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">正常</span>;
  };

  const renderTypeBadge = (type: TransitType) => {
    if (type === "entry") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
          <Icon icon={faArrowRightToBracket} className="text-[10px]" />
          入场
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
        <Icon icon={faArrowRightFromBracket} className="text-[10px]" />
        出场
      </span>
    );
  };

  return (
    <>
      <header className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">出入记录</h1>
            <p className="text-sm text-gray-500 mt-0.5">查询历史通行记录，处理异常数据</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen((v) => !v)}
              className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              disabled={exportingFormat !== null}
            >
              <Icon icon={faDownload} className="text-gray-400" />
              {exportingFormat ? `导出${exportingFormat.toUpperCase()}中` : "导出"}
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-20">
                <button
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => void doExport("csv")}
                  disabled={exportingFormat !== null}
                >
                  导出 CSV
                </button>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                  onClick={() => void doExport("xlsx")}
                  disabled={exportingFormat !== null}
                >
                  导出 Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-8 py-5 bg-white border-b border-surface-border">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">时间范围</span>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters((prev) => ({ ...prev, start_date: e.target.value }))}
              className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
            />
            <span className="text-gray-300">~</span>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters((prev) => ({ ...prev, end_date: e.target.value }))}
              className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div className="relative">
            <input
              type="text"
              value={filters.plate_number}
              onChange={(e) => setFilters((prev) => ({ ...prev, plate_number: e.target.value }))}
              placeholder="搜索车牌号..."
              className="w-48 h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
            />
            <Icon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          </div>
          <select
            value={filters.parking_lot_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, parking_lot_id: e.target.value }))}
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-brand-500"
          >
            <option value="">全部车场</option>
            {parkingLots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as FormFilters["type"] }))}
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">全部类型</option>
            <option value="entry">入场</option>
            <option value="exit">出场</option>
          </select>
          <select
            value={filters.status_group}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status_group: e.target.value as TransitStatusGroup,
              }))
            }
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">全部状态</option>
            <option value="normal">正常</option>
            <option value="exception">异常</option>
          </select>
          <button onClick={applyFilters} className="btn-primary h-9 px-4 rounded-lg text-white text-sm font-medium">
            查询
          </button>
          <button
            onClick={resetFilters}
            className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      {summary.total > 0 && (
        <div className="px-8 pt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Icon icon={faTriangleExclamation} className="text-amber-600" />
              </div>
              <div>
                <div className="font-medium text-amber-800">发现 {summary.total} 条异常记录需要处理</div>
                <div className="text-sm text-amber-600 mt-0.5">
                  包含：有入无出 {summary.no_exit} 条，有出无入 {summary.no_entry} 条，识别失败{" "}
                  {summary.recognition_failed} 条
                </div>
              </div>
            </div>
            <button onClick={showExceptionRecords} className="text-sm text-amber-700 hover:text-amber-800 font-medium">
              查看异常 →
            </button>
          </div>
        </div>
      )}

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
              {isLoading &&
                Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4" colSpan={8}>
                      <div className="h-5 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))}

              {!isLoading && records.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-sm text-gray-400">
                    {loadFailed ? "加载失败，请调整筛选后重试" : "暂无符合条件的出入记录"}
                  </td>
                </tr>
              )}

              {!isLoading &&
                records.map((record) => {
                  const { date, time } = formatDateTimeParts(record.created_at);
                  const exception = isExceptionStatus(record.status);
                  const rowTint =
                    record.status === "recognition_failed"
                      ? "bg-amber-50/30"
                      : record.status === "no_exit" || record.status === "no_entry"
                        ? "bg-red-50/30"
                        : "";
                  const plateColor = record.status === "recognition_failed" ? "text-amber-600" : "text-gray-900";
                  const isResolvedException = exception && Boolean(record.resolved_at);

                  return (
                    <tr key={record.id} className={`transition-colors hover:bg-gray-50 ${rowTint}`}>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{time}</div>
                        <div className="text-xs text-gray-400">{date}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-mono font-bold ${plateColor}`}>{record.plate_number ?? "--"}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{record.parking_lot_name || "--"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{record.gate_name || "--"}</td>
                      <td className="px-6 py-4 text-center">{renderTypeBadge(record.type)}</td>
                      <td
                        className={`px-6 py-4 text-center text-sm ${
                          record.fee === null ? "text-gray-400" : "font-medium text-emerald-600"
                        }`}
                      >
                        {formatCurrency(record.fee)}
                      </td>
                      <td className="px-6 py-4 text-center">{renderStatusBadge(record.status)}</td>
                      <td className="px-6 py-4 text-center">
                        {!exception || isResolvedException ? (
                          <button
                            onClick={() => void openDetailModal(record.id)}
                            className="text-sm text-brand-600 hover:text-brand-700"
                          >
                            详情
                          </button>
                        ) : (
                          <button
                            onClick={() => openExceptionModal(record)}
                            className={`text-sm font-medium ${
                              record.status === "recognition_failed"
                                ? "text-amber-600 hover:text-amber-700"
                                : "text-red-600 hover:text-red-700"
                            }`}
                          >
                            {record.status === "recognition_failed" ? "补录" : "处理"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between">
            <div className="text-sm text-gray-500">
              显示 {displayStart}-{displayEnd} 条，共 {total.toLocaleString("zh-CN")} 条
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon icon={faChevronLeft} className="text-xs" />
              </button>
              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      page === item
                        ? "bg-brand-600 text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon icon={faChevronRight} className="text-xs" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={() => setIsDetailModalOpen(false)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-4">
            <div className="bg-white rounded-2xl shadow-2xl">
              <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">通行记录详情</h3>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon icon={faXmark} />
                </button>
              </div>
              <div className="p-6">
                {isDetailLoading || !detailRecord ? (
                  <div className="py-12 text-center text-sm text-gray-400">加载详情中...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      {detailRecord.image_url ? (
                        <div
                          className="aspect-video rounded-xl bg-gray-100 bg-cover bg-center"
                          style={{ backgroundImage: `url('${detailRecord.image_url}')` }}
                        />
                      ) : (
                        <div className="aspect-video rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                          暂无抓拍图片
                        </div>
                      )}
                      <p className="text-xs text-gray-400 text-center mt-2">{typeText(detailRecord.type)}抓拍图片</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">车牌号</span>
                        <span className="font-mono font-bold text-gray-900">{detailRecord.plate_number ?? "--"}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">通行类型</span>
                        {renderTypeBadge(detailRecord.type)}
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">通行时间</span>
                        <span className="text-sm text-gray-900">
                          {new Date(detailRecord.created_at).toLocaleString("zh-CN", { hour12: false })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">所属车场</span>
                        <span className="text-sm text-gray-900">{detailRecord.parking_lot_name || "--"}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">出入口</span>
                        <span className="text-sm text-gray-900">{detailRecord.gate_name || "--"}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-500">设备序列号</span>
                        <span className="text-sm text-gray-600 font-mono">{detailDeviceSerial}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="h-10 px-5 rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isExceptionModalOpen && exceptionRecord && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={() => setIsExceptionModalOpen(false)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4">
            <div className="bg-white rounded-2xl shadow-2xl">
              <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">异常记录处理</h3>
                <button
                  onClick={() => setIsExceptionModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon icon={faXmark} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="p-4 bg-amber-50 rounded-xl flex items-start gap-3">
                  <Icon icon={faTriangleExclamation} className="text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-amber-800">异常类型：{statusText(exceptionRecord.status)}</div>
                    <div className="text-xs text-amber-600 mt-1">{exceptionHint(exceptionRecord.status)}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    补录车牌号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={resolvePlateNumber}
                    onChange={(e) => setResolvePlateNumber(e.target.value)}
                    placeholder="请输入车牌号，如：沪A·88888"
                    className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">处理备注</label>
                  <textarea
                    rows={3}
                    value={resolveRemark}
                    onChange={(e) => setResolveRemark(e.target.value)}
                    placeholder="选填，记录处理原因"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsExceptionModalOpen(false)}
                  className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => void submitExceptionResolve()}
                  disabled={isResolving}
                  className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResolving ? "处理中..." : "确认处理"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
