"use client";

import { useCurrentTime } from "@/hooks/useCurrentTime";

interface HeaderProps {
  title: string;
  description?: string;
  showStatus?: boolean;
  actions?: React.ReactNode;
}

export function Header({ title, description, showStatus = true, actions }: HeaderProps) {
  const currentTime = useCurrentTime();

  return (
    <header className="bg-white border-b border-surface-border sticky top-0 z-10">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {showStatus && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 status-dot"></span>
                <span className="text-gray-500">实时更新中</span>
              </div>
              <span className="text-sm text-gray-400">{currentTime}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
