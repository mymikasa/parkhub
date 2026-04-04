"use client";

import { Icon } from "@/components/icons/FontAwesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { TransitRecord } from "@/lib/transit-record/types";
import { formatDateTimeParts, formatCurrency, statusText, typeText } from "./helpers";

interface RecordDetailModalProps {
  open: boolean;
  onClose: () => void;
  record: TransitRecord | null;
  deviceSerial: string;
  isLoading: boolean;
}

export function RecordDetailModal({ open, onClose, record, deviceSerial, isLoading }: RecordDetailModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={onClose} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-4">
        <div className="bg-white rounded-2xl shadow-2xl">
          <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">通行记录详情</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              <Icon icon={faXmark} />
            </button>
          </div>
          <div className="p-6">
            {isLoading || !record ? (
              <div className="py-12 text-center text-sm text-gray-400">加载详情中...</div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  {record.image_url ? (
                    <div className="aspect-video rounded-xl bg-gray-100 bg-cover bg-center" style={{ backgroundImage: `url('${record.image_url}')` }} />
                  ) : (
                    <div className="aspect-video rounded-xl bg-gray-100 flex items-center justify-center text-sm text-gray-400">暂无抓拍图片</div>
                  )}
                  <p className="text-xs text-gray-400 text-center mt-2">{typeText(record.type)}抓拍图片</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">车牌号</span><span className="font-mono font-bold text-gray-900">{record.plate_number ?? "--"}</span></div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">通行类型</span><span className="text-sm text-gray-600">{typeText(record.type)}</span></div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">通行时间</span><span className="text-sm text-gray-900">{new Date(record.created_at).toLocaleString("zh-CN", { hour12: false })}</span></div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">所属车场</span><span className="text-sm text-gray-900">{record.parking_lot_name || "--"}</span></div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">出入口</span><span className="text-sm text-gray-900">{record.gate_name || "--"}</span></div>
                  <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-500">设备序列号</span><span className="text-sm text-gray-600 font-mono">{deviceSerial}</span></div>
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end">
            <button onClick={onClose} className="h-10 px-5 rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 transition-colors">关闭</button>
          </div>
        </div>
      </div>
    </div>
  );
}
