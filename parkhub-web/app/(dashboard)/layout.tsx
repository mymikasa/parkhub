import { Sidebar } from "@/components/layout/Sidebar";
import { DeviceAlertCenter } from "@/components/device/DeviceAlertCenter";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface-muted">
      <Sidebar />
      <main className="flex-1 ml-64">
        {children}
        <DeviceAlertCenter />
      </main>
    </div>
  );
}
