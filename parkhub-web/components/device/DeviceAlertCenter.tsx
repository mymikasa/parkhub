"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/FontAwesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePermissions, useUser } from "@/lib/auth/hooks";
import { getValidAccessToken } from "@/lib/auth/store";

type DevicesOfflineAlert = {
  type: "devices_offline";
  count: number;
  parking_lot_name: string;
  timestamp: string;
};

type DeviceOnlineAlert = {
  type: "device_online";
  device_id: string;
  device_name: string;
  parking_lot_id: string;
  timestamp: string;
};

type DeviceAlertMessage = DevicesOfflineAlert | DeviceOnlineAlert;

const RECONNECT_DELAY_MS = 3000;

function toWebSocketBase(httpBase: string): string {
  if (httpBase.startsWith("https://")) {
    return "wss://" + httpBase.slice("https://".length);
  }
  if (httpBase.startsWith("http://")) {
    return "ws://" + httpBase.slice("http://".length);
  }
  return httpBase;
}

function parseMessage(raw: string): DeviceAlertMessage | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.type === "devices_offline") {
      return {
        type: "devices_offline",
        count: Number(data.count || 0),
        parking_lot_name: String(data.parking_lot_name || ""),
        timestamp: String(data.timestamp || ""),
      };
    }
    if (data.type === "device_online") {
      return {
        type: "device_online",
        device_id: String(data.device_id || ""),
        device_name: String(data.device_name || ""),
        parking_lot_id: String(data.parking_lot_id || ""),
        timestamp: String(data.timestamp || ""),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function DeviceAlertCenter() {
  const user = useUser();
  const { isPlatformAdmin, isTenantAdmin } = usePermissions();
  const isAdmin = isPlatformAdmin || isTenantAdmin;
  const [queue, setQueue] = useState<DeviceAlertMessage[]>([]);
  const [current, setCurrent] = useState<DeviceAlertMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const wsBase = useMemo(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    return toWebSocketBase(apiBase);
  }, []);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [first, ...rest] = queue;
    setCurrent(first);
    setQueue(rest);
  }, [queue, current]);

  useEffect(() => {
    let cancelled = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const cleanupSocket = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      clearReconnect();
      reconnectTimerRef.current = window.setTimeout(() => {
        void connect();
      }, RECONNECT_DELAY_MS);
    };

    const connect = async () => {
      if (!isAdmin || !user) return;

      const token = await getValidAccessToken();
      if (!token || cancelled) {
        scheduleReconnect();
        return;
      }

      cleanupSocket();
      const socket = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        const message = parseMessage(event.data);
        if (!message) return;
        setQueue((prev) => [...prev, message]);
      };

      socket.onclose = () => {
        wsRef.current = null;
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    if (isAdmin && user) {
      void connect();
    } else {
      cleanupSocket();
      clearReconnect();
    }

    return () => {
      cancelled = true;
      clearReconnect();
      cleanupSocket();
    };
  }, [isAdmin, user, wsBase]);

  const handleClose = () => {
    setCurrent(null);
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={!!current} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-[2px]"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_24px_60px_-22px_rgba(15,23,42,0.45)] sm:max-w-md"
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-slate-900">
              设备实时告警
            </DialogTitle>
            <DialogClose className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <Icon icon={faXmark} />
            </DialogClose>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          {current?.type === "devices_offline" ? (
            <>
              <p className="text-sm text-slate-900">
                {current.parking_lot_name || "未知车场"}有 {current.count} 台设备离线。
              </p>
              <p className="text-xs text-slate-500">请尽快检查网络或供电状态。</p>
            </>
          ) : current?.type === "device_online" ? (
            <>
              <p className="text-sm text-slate-900">
                设备 {current.device_name || current.device_id} 已恢复在线。
              </p>
              <p className="text-xs text-slate-500">设备ID：{current.device_id}</p>
            </>
          ) : null}
          {current?.timestamp && (
            <p className="text-xs text-slate-400">
              时间：{new Date(current.timestamp).toLocaleString("zh-CN")}
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            关闭
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
