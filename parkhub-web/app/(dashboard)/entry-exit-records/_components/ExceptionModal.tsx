"use client";

import { Icon } from "@/components/icons/FontAwesome";
import { faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { TransitRecord } from "@/lib/transit-record/types";
import { statusText, exceptionHint } from "./helpers";

interface ExceptionModalProps {
  open: boolean;
  onClose: () => void;
  record: TransitRecord | null;
  onSubmit: (plate: string, remark: string) => Promise<void>;
  isSubmitting: boolean;
}

export function ExceptionModal({ open, onClose, record, onSubmit, isSubmitting }: ExceptionModalProps) {
  if (!open || !record) return null;

  const [resolvePlateNumber, setResolvePlateNumber] = useState(record.plate_number ?? "");
  const [resolveRemark, setResolveRemark] = useState(record.remark ?? "");

  const handleSubmit = async () => {
    if (!resolvePlateNumber.trim()) { toast.error("请输入补录车牌号"); return; }
    await onSubmit(resolvePlateNumber.trim(), resolveRemark.trim());
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={onClose} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-2xl">
          <div className="px-6 py-5 border-b border-surface-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">异常记录处理</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              <Icon icon={faXmark} />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="p-4 bg-amber-50 rounded-xl flex items-start gap-3">
              <Icon icon={faTriangleExclamation} className="text-amber-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-800">异常类型：{statusText(record.status)}</div>
                <div className="text-xs text-amber-600 mt-1">{exceptionHint(record.status)}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">补录车牌号 <span className="text-red-500">*</span></label>
              <input type="text" value={resolvePlateNumber} onChange={(e) => setResolvePlateNumber(e.target.value)} placeholder="请输入车牌号，如：沪A·88888" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">处理备注</label>
              <textarea rows={3} value={resolveRemark} onChange={(e) => setResolveRemark(e.target.value)} placeholder="选填，记录处理原因" className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 resize-none" />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
            <button onClick={onClose} className="h-10 px-5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary h-10 px-5 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? "处理中..." : "确认处理"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
