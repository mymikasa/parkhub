"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icons/FontAwesome";
import { faDownload, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { getParkingLots, getGates } from "@/lib/parking-lot/api";
import { exportTransitRecords, getTransitExceptionSummary, getTransitRecord, getTransitRecords, resolveTransitRecord } from "@/lib/transit-record/api";
import type { TransitRecord, TransitStatus, TransitType } from "@/lib/transit-record/types";
import { FormFilters, ParkingLotOption, toDateInputValue, buildBaseFilter } from "./_components/helpers";
import { RecordFilters } from "./_components/RecordFilters";
import { RecordTable } from "./_components/RecordTable";
import { RecordDetailModal } from "./_components/RecordDetailModal";
import { ExceptionModal } from "./_components/ExceptionModal";

export default function EntryExitRecordsPage() {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const defaultFilters = useMemo<FormFilters>(() => ({ start_date: today, end_date: today, plate_number: "", parking_lot_id: "", type: "all", status_group: "all" }), [today]);
  const pageSize = 8;

  const [filters, setFilters] = useState<FormFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FormFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [parkingLots, setParkingLots] = useState<ParkingLotOption[]>([]);
  const [records, setRecords] = useState<TransitRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState({ no_exit: 0, no_entry: 0, recognition_failed: 0, total: 0 });
  const [loadFailed, setLoadFailed] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<TransitRecord | null>(null);
  const [detailDeviceSerial, setDetailDeviceSerial] = useState("--");
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionRecord, setExceptionRecord] = useState<TransitRecord | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"csv" | "xlsx" | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const baseFilter = useMemo(() => buildBaseFilter(appliedFilters), [appliedFilters]);

  const loadParkingLotOptions = useCallback(async () => { try { const result = await getParkingLots({ page: 1, page_size: 1000 }); setParkingLots(result.items.map((item) => ({ id: item.id, name: item.name }))); } catch { toast.error("车场列表加载失败"); } }, []);
  const loadData = useCallback(async () => {
    setIsLoading(true); setLoadFailed(false);
    try {
      const [list, exceptionSummary] = await Promise.all([getTransitRecords({ ...baseFilter, page, page_size: pageSize }), getTransitExceptionSummary(baseFilter)]);
      setRecords(list.items); setTotal(list.total); setSummary(exceptionSummary);
      const latestPage = Math.max(1, Math.ceil(list.total / pageSize));
      if (page > latestPage) setPage(latestPage);
    } catch (error) { setLoadFailed(true); setRecords([]); setTotal(0); setSummary({ no_exit: 0, no_entry: 0, recognition_failed: 0, total: 0 }); toast.error(error instanceof Error ? error.message : "加载出入记录失败"); } finally { setIsLoading(false); }
  }, [baseFilter, page]);

  useEffect(() => { void loadParkingLotOptions(); }, [loadParkingLotOptions]);
  useEffect(() => { void loadData(); }, [loadData]);

  const openDetailModal = async (recordId: string) => {
    setIsDetailModalOpen(true); setIsDetailLoading(true); setDetailRecord(null); setDetailDeviceSerial("--");
    try {
      const record = await getTransitRecord(recordId); setDetailRecord(record);
      if (record.parking_lot_id) { try { const gates = await getGates(record.parking_lot_id); const gate = gates.find((item) => item.id === record.gate_id); setDetailDeviceSerial(gate?.device?.serial_number ?? "--"); } catch { setDetailDeviceSerial("--"); } }
    } catch (error) { toast.error(error instanceof Error ? error.message : "加载详情失败"); setIsDetailModalOpen(false); } finally { setIsDetailLoading(false); }
  };

  const openExceptionModal = (record: TransitRecord) => { setExceptionRecord(record); setIsExceptionModalOpen(true); };

  const submitExceptionResolve = async (plate: string, remark: string) => {
    if (!exceptionRecord) return;
    setIsResolving(true);
    try { await resolveTransitRecord(exceptionRecord.id, { plate_number: plate, remark: remark || undefined }); toast.success("异常记录处理成功"); setIsExceptionModalOpen(false); setExceptionRecord(null); await loadData(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "处理失败"); } finally { setIsResolving(false); }
  };

  const doExport = async (format: "csv" | "xlsx") => {
    setExportingFormat(format);
    try { const { blob, filename } = await exportTransitRecords(baseFilter, format); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); toast.success(`已开始下载 ${format.toUpperCase()} 文件`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "导出失败"); } finally { setExportingFormat(null); setIsExportMenuOpen(false); }
  };

  return (
    <>
      <header className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div><h1 className="text-xl font-semibold text-gray-900">出入记录</h1><p className="text-sm text-gray-500 mt-0.5">查询历史通行记录，处理异常数据</p></div>
          <div className="relative">
            <button onClick={() => setIsExportMenuOpen((v) => !v)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50" disabled={exportingFormat !== null}>
              <Icon icon={faDownload} className="text-gray-400" />{exportingFormat ? `导出${exportingFormat.toUpperCase()}中` : "导出"}
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-20">
                <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => void doExport("csv")} disabled={exportingFormat !== null}>导出 CSV</button>
                <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100" onClick={() => void doExport("xlsx")} disabled={exportingFormat !== null}>导出 Excel</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <RecordFilters filters={filters} parkingLots={parkingLots} onFiltersChange={setFilters} onApply={() => { setPage(1); setAppliedFilters({ ...filters, plate_number: filters.plate_number.trim() }); setIsExportMenuOpen(false); }} onReset={() => { setFilters(defaultFilters); setAppliedFilters(defaultFilters); setPage(1); setIsExportMenuOpen(false); }}
        exportingFormat={exportingFormat} isExportMenuOpen={isExportMenuOpen} onToggleExport={() => setIsExportMenuOpen((v) => !v)} onExport={(f) => void doExport(f)} />

      {summary.total > 0 && (
        <div className="px-8 pt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Icon icon={faTriangleExclamation} className="text-amber-600" /></div>
              <div><div className="font-medium text-amber-800">发现 {summary.total} 条异常记录需要处理</div><div className="text-sm text-amber-600 mt-0.5">包含：有入无出 {summary.no_exit} 条，有出无入 {summary.no_entry} 条，识别失败 {summary.recognition_failed} 条</div></div></div>
            <button onClick={() => { const next = { ...appliedFilters, status_group: "exception" as const }; setFilters(next); setAppliedFilters(next); setPage(1); }} className="text-sm text-amber-700 hover:text-amber-800 font-medium">查看异常 →</button>
          </div>
        </div>
      )}

      <RecordTable records={records} isLoading={isLoading} loadFailed={loadFailed} total={total} currentPage={page} pageSize={pageSize} onPageChange={setPage} onOpenDetail={(id) => void openDetailModal(id)} onOpenException={openExceptionModal} />

      <RecordDetailModal open={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} record={detailRecord} deviceSerial={detailDeviceSerial} isLoading={isDetailLoading} />
      <ExceptionModal open={isExceptionModalOpen} onClose={() => setIsExceptionModalOpen(false)} record={exceptionRecord} onSubmit={submitExceptionResolve} isSubmitting={isResolving} />
    </>
  );
}
