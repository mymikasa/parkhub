import {
  Activity,
  Clock,
  Cpu,
  ShieldOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { DEVICE_OFFLINE_TIMEOUT_MS } from "@/lib/device/status";
import type { DeviceStatus } from "@/lib/device/types";

export const STATUS_CONFIG: Record<
  DeviceStatus,
  {
    label: string;
    dotColor: string;
    softBg: string;
    textColor: string;
    ringColor: string;
    iconBg: string;
    iconColor: string;
    icon: React.ElementType;
    emphasis: string;
    rowTint: string;
    note: string;
  }
> = {
  active: {
    label: "在线",
    dotColor: "bg-emerald-400",
    softBg: "bg-emerald-50",
    textColor: "text-emerald-700",
    ringColor: "ring-emerald-500/[0.15]",
    iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    iconColor: "text-white",
    icon: Wifi,
    emphasis: "from-emerald-500/[0.15] to-emerald-500/5",
    rowTint: "hover:bg-emerald-50/40",
    note: "链路稳定",
  },
  offline: {
    label: "离线",
    dotColor: "bg-rose-400",
    softBg: "bg-rose-50",
    textColor: "text-rose-700",
    ringColor: "ring-rose-500/[0.15]",
    iconBg: "bg-gradient-to-br from-rose-400 to-rose-600",
    iconColor: "text-white",
    icon: WifiOff,
    emphasis: "from-rose-500/[0.15] to-rose-500/5",
    rowTint: "bg-rose-50/30 hover:bg-rose-50/50",
    note: "需要恢复连接",
  },
  pending: {
    label: "待分配",
    dotColor: "bg-amber-400",
    softBg: "bg-amber-50",
    textColor: "text-amber-700",
    ringColor: "ring-amber-500/[0.15]",
    iconBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    iconColor: "text-white",
    icon: Clock,
    emphasis: "from-amber-500/[0.15] to-amber-500/5",
    rowTint: "bg-amber-50/30 hover:bg-amber-50/50",
    note: "等待部署绑定",
  },
  disabled: {
    label: "已禁用",
    dotColor: "bg-slate-400",
    softBg: "bg-slate-100",
    textColor: "text-slate-700",
    ringColor: "ring-slate-500/[0.15]",
    iconBg: "bg-gradient-to-br from-slate-400 to-slate-600",
    iconColor: "text-white",
    icon: ShieldOff,
    emphasis: "from-slate-500/[0.15] to-slate-500/5",
    rowTint: "bg-slate-100/50 hover:bg-slate-100/80",
    note: "当前不可用",
  },
};

export function formatHeartbeat(heartbeat: string | null): {
  text: string;
  full: string;
} {
  if (!heartbeat) return { text: "暂无心跳", full: "未收到心跳" };
  const date = new Date(heartbeat);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const full = date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (diffMin < 1) return { text: "刚刚同步", full };
  if (diffMin < 60) return { text: `${diffMin} 分钟前`, full };
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { text: `${diffHours} 小时前`, full };
  const diffDays = Math.floor(diffHours / 24);
  return { text: `${diffDays} 天前`, full };
}

export const HEARTBEAT_TIMEOUT_MINUTES = DEVICE_OFFLINE_TIMEOUT_MS / 60000;

export function generatePages(current: number, total: number): (number | "...")[] {
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

export function formatPercent(value: number, total: number): string {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function getAttentionText(status: DeviceStatus): string {
  if (status === "offline") return "设备离线，需要排查网络或供电";
  if (status === "pending") return "尚未完成车场或闸口绑定";
  if (status === "disabled") return "设备已禁用，不参与运行";
  return "运行稳定，链路正常";
}
