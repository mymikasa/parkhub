'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type { GateWithDevice, GateType } from '@/lib/parking-lot/types';
import { useCreateGate, useDeleteGate, useGates, useUpdateGate } from '@/lib/parking-lot/hooks';

interface GateConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkingLotId: string;
  parkingLotName: string;
}

export function GateConfigDialog({
  open,
  onOpenChange,
  parkingLotId,
  parkingLotName,
}: GateConfigDialogProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGate, setEditingGate] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newGateName, setNewGateName] = useState('');
  const [newGateType, setNewGateType] = useState<GateType>('entry');
  const [editGateName, setEditGateName] = useState('');

  const { data: gatesData = [], isLoading, isError, error } = useGates(open ? parkingLotId : '');
  const createGateMutation = useCreateGate();
  const updateGateMutation = useUpdateGate();
  const deleteGateMutation = useDeleteGate();
  const gates = gatesData;
  const isSubmitting = createGateMutation.isPending || updateGateMutation.isPending || deleteGateMutation.isPending;

  useEffect(() => {
    if (open) return;
    setIsAdding(false);
    setEditingGate(null);
    setDeleteConfirm(null);
    setNewGateName('');
    setNewGateType('entry');
    setEditGateName('');
  }, [open]);

  const handleAddGate = async () => {
    if (!newGateName.trim()) {
      toast.error('请输入出入口名称');
      return;
    }

    try {
      await createGateMutation.mutateAsync({
        parkingLotId,
        data: {
          name: newGateName.trim(),
          type: newGateType,
        },
      });
      setIsAdding(false);
      setNewGateName('');
      setNewGateType('entry');
      toast.success('出入口添加成功');
    } catch (err) {
      const message = err instanceof Error ? err.message : '添加失败，请重试';
      toast.error(message);
    }
  };

  const handleUpdateGate = async (gateId: string) => {
    if (!editGateName.trim()) {
      toast.error('请输入出入口名称');
      return;
    }

    try {
      await updateGateMutation.mutateAsync({
        id: gateId,
        data: {
          name: editGateName.trim(),
        },
      });
      setEditingGate(null);
      setEditGateName('');
      toast.success('修改已保存');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败，请重试';
      toast.error(message);
    }
  };

  const handleDeleteGate = async (gateId: string) => {
    try {
      await deleteGateMutation.mutateAsync(gateId);
      setDeleteConfirm(null);
      toast.success('删除成功');
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败，请重试';
      toast.error(message);
    }
  };

  const startEdit = (gate: GateWithDevice) => {
    setEditingGate(gate.id);
    setEditGateName(gate.name);
  };

  const cancelEdit = () => {
    setEditingGate(null);
    setEditGateName('');
  };

  const entryCount = gates.filter(g => g.type === 'entry').length;
  const exitCount = gates.filter(g => g.type === 'exit').length;
  const onlineCount = gates.reduce((sum, gate) => sum + Math.max((gate.bound_device_count || 0) - (gate.offline_device_count || 0), 0), 0);
  const offlineCount = gates.reduce((sum, gate) => sum + (gate.offline_device_count || 0), 0);
  const unboundCount = gates.filter(g => (g.bound_device_count || 0) === 0).length;
  const deletingGate = deleteConfirm ? gates.find((gate) => gate.id === deleteConfirm) ?? null : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-[4px]"
        className="sm:max-w-4xl rounded-2xl bg-white p-0 gap-0 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 border-0"
      >
        <div className="border-b border-surface-border px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">出入口配置</DialogTitle>
              <p className="mt-1 text-sm text-gray-500">{parkingLotName}</p>
            </div>
            <DialogClose className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-surface-border bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_100%)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-gray-400">入口</div>
              <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-gray-900">
                <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
                {entryCount}
              </div>
            </div>
            <div className="rounded-2xl border border-surface-border bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-gray-400">出口</div>
              <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-gray-900">
                <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
                {exitCount}
              </div>
            </div>
            <div className="rounded-2xl border border-surface-border bg-[linear-gradient(135deg,#f8fff8_0%,#ffffff_100%)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-gray-400">在线设备</div>
              <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-emerald-600">
                <Wifi className="h-4 w-4" />
                {onlineCount}
              </div>
            </div>
            <div className="rounded-2xl border border-surface-border bg-[linear-gradient(135deg,#fffaf8_0%,#ffffff_100%)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-gray-400">异常 / 未绑</div>
              <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-gray-900">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                {offlineCount + unboundCount}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="border-b border-surface-border p-6 lg:border-r lg:border-b-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">出入口列表</h3>
                <p className="mt-1 text-xs text-gray-500">查看当前绑定摘要和风险状态，设备归属请前往设备管理页处理。</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
                className="border-brand-100 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                添加出入口
              </Button>
            </div>

            <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex min-h-[12rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50/60 px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-500 ring-1 ring-red-100">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-900">出入口加载失败</p>
                  <p className="mt-1 text-xs text-gray-500">{error instanceof Error ? error.message : '请稍后重试'}</p>
                </div>
              ) : gates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
                    <Plus className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-900">暂无出入口数据</p>
                  <p className="mt-1 text-xs text-gray-500">先添加入口或出口，再到设备管理页完成绑定。</p>
                </div>
              ) : (
                gates.map((gate) => {
                  const isOffline = (gate.offline_device_count || 0) > 0;
                  const boundCount = gate.bound_device_count || 0;

                  return (
                    <div
                      key={gate.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isOffline
                          ? 'border-red-200 bg-red-50/40'
                          : editingGate === gate.id
                          ? 'border-brand-200 bg-brand-50/40'
                          : 'border-surface-border bg-slate-50/80 hover:bg-white'
                      }`}
                    >
                      {editingGate === gate.id ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              gate.type === 'entry' ? 'bg-emerald-100' : 'bg-blue-100'
                            }`}>
                              {gate.type === 'entry' ? (
                                <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <ArrowUpFromLine className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">编辑{gate.type === 'entry' ? '入口' : '出口'}</div>
                              <div className="text-xs text-gray-500">这里只维护出入口名称，设备归属请在设备管理页调整。</div>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600">名称</Label>
                            <Input
                              value={editGateName}
                              onChange={(e) => setEditGateName(e.target.value)}
                              className="h-10 rounded-xl border-gray-200 bg-white"
                            />
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={cancelEdit} className="bg-white">
                              取消
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                cancelEdit();
                                setDeleteConfirm(gate.id);
                              }}
                              className="bg-red-50 text-red-600 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateGate(gate.id)}
                              disabled={isSubmitting}
                              className="btn-primary border-0 text-white"
                            >
                              {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />保存中...</>
                              ) : (
                                '保存'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                              gate.type === 'entry' ? 'bg-emerald-100' : 'bg-blue-100'
                            }`}>
                              {gate.type === 'entry' ? (
                                <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <ArrowUpFromLine className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-gray-900">{gate.name}</p>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                  gate.type === 'entry' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {gate.type === 'entry' ? '入口' : '出口'}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                                {boundCount > 0 ? (
                                  <>
                                    <span className="text-gray-500">
                                      已绑定设备: <span className="font-medium text-gray-700">{boundCount} 台</span>
                                    </span>
                                    {isOffline ? (
                                      <span className="inline-flex items-center gap-1 text-red-500">
                                        <WifiOff className="h-3 w-3" />
                                        存在离线设备
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-emerald-600">
                                        <Wifi className="h-3 w-3" />
                                        绑定设备在线
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400">未绑定设备</span>
                                )}
                              </div>
                              {isOffline && (
                                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs text-red-600">
                                  <AlertCircle className="h-3 w-3" />
                                  当前出入口存在 {gate.offline_device_count} 台离线设备
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              boundCount === 0
                                ? 'bg-gray-100 text-gray-500'
                                : isOffline
                                ? 'bg-red-50 text-red-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {boundCount === 0 ? '未绑定' : isOffline ? '存在离线' : '已绑定'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:bg-white hover:text-gray-600"
                              onClick={() => startEdit(gate)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-slate-50/70 p-6">
            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">新增出入口</h3>
                  <p className="mt-1 text-xs text-gray-500">创建完成后，可在设备管理页为该出入口分配设备。</p>
                </div>
                {isAdding && (
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700">
                    编辑中
                  </span>
                )}
              </div>

              {isAdding ? (
                <div className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-name" className="text-xs text-gray-600">名称 *</Label>
                    <Input
                      id="new-name"
                      value={newGateName}
                      onChange={(e) => setNewGateName(e.target.value)}
                      placeholder="如：1号入口"
                      className="h-10 rounded-xl border-gray-200 bg-gray-50/70 focus-visible:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">类型 *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="default"
                        variant={newGateType === 'entry' ? 'default' : 'outline'}
                        onClick={() => setNewGateType('entry')}
                        className={newGateType === 'entry' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white'}
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                        入口
                      </Button>
                      <Button
                        type="button"
                        size="default"
                        variant={newGateType === 'exit' ? 'default' : 'outline'}
                        onClick={() => setNewGateType('exit')}
                        className={newGateType === 'exit' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white'}
                      >
                        <ArrowUpFromLine className="h-4 w-4" />
                        出口
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    设备绑定入口已迁移到设备管理页，这里只创建基础出入口节点。
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="default"
                      variant="outline"
                      className="bg-white"
                      onClick={() => {
                        setIsAdding(false);
                        setNewGateName('');
                        setNewGateType('entry');
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      size="default"
                      onClick={handleAddGate}
                      disabled={isSubmitting}
                      className="btn-primary border-0 text-white"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" />添加中...</>
                      ) : (
                        '确认添加'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="mt-5 flex w-full items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">创建新的出入口节点</div>
                    <div className="mt-1 text-xs text-gray-500">支持入口 / 出口类型切换，设备后续从设备管理页绑定。</div>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-slate-200">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-surface-border bg-white px-6 py-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
              入口 {entryCount}
            </span>
            <span className="flex items-center gap-1">
              <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
              出口 {exitCount}
            </span>
          </div>
          <Button onClick={() => onOpenChange(false)} className="bg-gray-900 text-white hover:bg-gray-800">
            完成
          </Button>
        </div>

        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent className="bg-white ring-0 border-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-0 overflow-hidden">
            <div className="border-b border-red-100 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_65%)] px-5 py-4">
              <AlertDialogHeader className="grid-cols-[auto_1fr] gap-x-3 gap-y-1 place-items-start text-left">
                <AlertDialogMedia className="mb-0 h-11 w-11 rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
                  <Trash2 className="h-5 w-5" />
                </AlertDialogMedia>
                <AlertDialogTitle className="text-base font-semibold text-gray-900">删除出入口</AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-6 text-gray-500">
                  删除后将移除该出入口配置，若存在绑定设备会一并解除关联。此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>

            {deletingGate && (
              <div className="px-5 py-4">
                <div className="rounded-2xl border border-surface-border bg-slate-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      deletingGate.type === 'entry' ? 'bg-emerald-100' : 'bg-blue-100'
                    }`}>
                      {deletingGate.type === 'entry' ? (
                        <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <ArrowUpFromLine className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{deletingGate.name}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          deletingGate.type === 'entry' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {deletingGate.type === 'entry' ? '入口' : '出口'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {(deletingGate.bound_device_count || 0) > 0
                          ? `当前绑定设备：${deletingGate.bound_device_count} 台`
                          : '当前未绑定设备'}
                      </p>
                      {(deletingGate.offline_device_count || 0) > 0 && (
                        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          当前出入口存在 {deletingGate.offline_device_count} 台离线设备
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <AlertDialogFooter className="border-t border-surface-border bg-slate-50/70 px-5 py-4">
              <AlertDialogCancel className="bg-white">取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteGate(deleteConfirm!)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
