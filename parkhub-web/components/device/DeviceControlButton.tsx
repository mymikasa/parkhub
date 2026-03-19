'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DoorOpen, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useControlDevice } from '@/lib/device/hooks';
import { getRuntimeDeviceStatus } from '@/lib/device/status';
import type { DeviceStatus } from '@/lib/device/types';

interface DeviceControlButtonProps {
  deviceId: string;
  deviceName: string;
  status: DeviceStatus;
  lastHeartbeat?: string | null;
  disabled?: boolean;
  onSuccess?: () => void;
}

export function DeviceControlButton({
  deviceId,
  deviceName,
  status,
  lastHeartbeat = null,
  disabled = false,
  onSuccess,
}: DeviceControlButtonProps) {
  const [open, setOpen] = useState(false);
  const controlMutation = useControlDevice();

  const runtimeStatus = getRuntimeDeviceStatus(status, lastHeartbeat);
  const isOnline = runtimeStatus === 'active';
  const isDisabled = disabled || !isOnline;
  const isLoading = controlMutation.isPending;

  const handleControl = async () => {
    try {
      await controlMutation.mutateAsync({ id: deviceId, command: 'open_gate' });
      toast.success('控制指令已发送', {
        description: `设备 ${deviceName || deviceId} 的开闸指令已发送`,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送控制指令失败';
      toast.error('操作失败', {
        description: message,
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        disabled={isDisabled || isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <DoorOpen className="h-3.5 w-3.5" />
        )}
        远程开闸
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认开闸操作</AlertDialogTitle>
          <AlertDialogDescription>
            您即将对设备 <span className="font-medium text-slate-900">{deviceName || deviceId}</span> 发送开闸指令。
            <br />
            <br />
            请确认设备状态正常，此操作将被记录。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleControl}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                发送中...
              </>
            ) : (
              '确认开闸'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
