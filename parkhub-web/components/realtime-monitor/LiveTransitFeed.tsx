"use client";

import { useRef, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightToBracket,
  faArrowRightFromBracket,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { isExceptionStatus } from "@/lib/transit-record/types";
import type { TransitRecord } from "@/lib/transit-record";

interface LiveTransitFeedProps {
  records: TransitRecord[];
}

const placeholderImages = [
  "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=200&h=150&fit=crop",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=150&fit=crop",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&h=150&fit=crop",
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=200&h=150&fit=crop",
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=150&fit=crop",
  "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=200&h=150&fit=crop",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?w=200&h=150&fit=crop",
];

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  return `${Math.floor(diffHour / 24)}天前`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function getImageUrl(record: TransitRecord, index: number): string {
  return record.image_url || placeholderImages[index % placeholderImages.length];
}

export function LiveTransitFeed({ records }: LiveTransitFeedProps) {
  const prevIdsRef = useRef<Set<string>>(new Set());

  const newIds = useMemo(() => {
    const prev = prevIdsRef.current;
    const currentIds = new Set(records.map((r) => r.id));
    const newOnes = new Set<string>();
    for (const id of currentIds) {
      if (!prev.has(id)) newOnes.add(id);
    }
    prevIdsRef.current = currentIds;
    return newOnes;
  }, [records]);

  return (
    <div className="bg-white rounded-xl border border-surface-border overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-red-500 status-dot"></span>
          <span className="text-sm font-medium text-gray-900">实时通行记录</span>
        </div>
        <Link href="/entry-exit-records" className="text-xs text-brand-600 hover:text-brand-700">
          查看全部 →
        </Link>
      </div>
      <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
        {records.map((record, index) => {
          const isNew = newIds.has(record.id);
          const isException = isExceptionStatus(record.status);
          const isEntry = record.type === "entry";

          return (
            <div
              key={record.id}
              className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors ${isNew ? "live-item" : ""} ${isException ? "bg-amber-50/30" : ""}`}
            >
              <div
                className="w-16 h-12 rounded-lg bg-cover bg-center flex-shrink-0 bg-gray-200"
                style={{ backgroundImage: `url('${getImageUrl(record, index)}')` }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isException ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                      异常
                    </span>
                  ) : isEntry ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                      <FontAwesomeIcon icon={faArrowRightToBracket} className="text-[10px]" />
                      入场
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      <FontAwesomeIcon icon={faArrowRightFromBracket} className="text-[10px]" />
                      出场
                    </span>
                  )}
                  <span className="font-mono font-bold text-gray-900">
                    {record.plate_number || "沪E·?????"}
                  </span>
                </div>
                <div className={`text-xs mt-1 ${isException ? "text-amber-600" : "text-gray-500"}`}>
                  {record.parking_lot_name} · {record.gate_name}
                  {isException && " · 识别失败"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-900">{formatTime(record.created_at)}</div>
                {isException ? (
                  <button className="text-xs text-brand-600 font-medium">处理</button>
                ) : record.fee != null && record.fee > 0 ? (
                  <div className="text-xs text-emerald-600 font-medium">¥{record.fee.toFixed(2)}</div>
                ) : (
                  <div className="text-xs text-gray-400">{getRelativeTime(record.created_at)}</div>
                )}
              </div>
            </div>
          );
        })}
        {records.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-gray-400">暂无通行记录</div>
        )}
      </div>
    </div>
  );
}
