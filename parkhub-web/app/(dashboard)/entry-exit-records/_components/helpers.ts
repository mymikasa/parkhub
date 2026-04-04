import type { TransitRecordFilter, TransitStatus, TransitStatusGroup, TransitType } from "@/lib/transit-record/types";

export interface FormFilters {
  start_date: string;
  end_date: string;
  plate_number: string;
  parking_lot_id: string;
  type: "all" | TransitType;
  status_group: TransitStatusGroup;
}

export interface ParkingLotOption {
  id: string;
  name: string;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toStartOfDayRFC3339(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T00:00:00`).toISOString();
}

export function toEndOfDayRFC3339(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T23:59:59`).toISOString();
}

export function formatDateTimeParts(value: string): { date: string; time: string } {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "--", time: "--:--:--" };
  const date = d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = d.toLocaleTimeString("zh-CN", { hour12: false });
  return { date, time };
}

export function formatCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "--";
  return `¥${value.toFixed(2)}`;
}

export function isExceptionStatus(status: TransitStatus): boolean {
  return status === "no_exit" || status === "no_entry" || status === "recognition_failed";
}

export function statusText(status: TransitStatus): string {
  switch (status) {
    case "normal": return "正常";
    case "paid": return "已缴费";
    case "no_exit": return "有入无出";
    case "no_entry": return "有出无入";
    case "recognition_failed": return "识别失败";
    default: return status;
  }
}

export function exceptionHint(status: TransitStatus): string {
  if (status === "recognition_failed") return "车牌识别失败，请手动补录车牌号";
  if (status === "no_entry") return "未找到匹配入场记录，请核对并补录车牌号";
  return "检测到异常停放记录，请核对并补录车牌号";
}

export function typeText(type: TransitType): string {
  return type === "entry" ? "入场" : "出场";
}

export function buildBaseFilter(filters: FormFilters): Omit<TransitRecordFilter, "page" | "page_size" | "status"> {
  return {
    parking_lot_id: filters.parking_lot_id || undefined,
    plate_number: filters.plate_number.trim() || undefined,
    type: filters.type === "all" ? undefined : filters.type,
    status_group: filters.status_group === "all" ? undefined : filters.status_group,
    start_date: toStartOfDayRFC3339(filters.start_date),
    end_date: toEndOfDayRFC3339(filters.end_date),
  };
}

export function buildPageItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  if (currentPage >= totalPages - 3) return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}
