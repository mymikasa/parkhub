"use client";

import { Header } from "@/components/layout/Header";

export default function DeviceManagementPage() {
  return (
    <>
      <Header title="设备管理" description="管理闸机、相机等IoT设备" />
      <div className="px-8 py-6">
        <div className="bg-white rounded-xl border border-surface-border p-6">
          <p className="text-gray-500">设备管理功能开发中...</p>
        </div>
      </div>
    </>
  );
}
