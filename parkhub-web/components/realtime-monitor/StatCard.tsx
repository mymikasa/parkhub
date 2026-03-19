"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";

interface StatCardProps {
  label: string;
  value: string;
  icon: IconProp;
  color: "emerald" | "blue" | "amber" | "violet";
  change?: string;
  subtitle?: string;
}

const colorMap = {
  emerald: {
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "ring-emerald-500/10",
    glow: "glow-green",
    badge: "text-emerald-600 bg-emerald-50",
  },
  blue: {
    text: "text-blue-600",
    bg: "bg-blue-50",
    ring: "ring-blue-500/10",
    glow: "glow-blue",
    badge: "text-blue-600 bg-blue-50",
  },
  amber: {
    text: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-500/10",
    glow: "glow-amber",
    badge: "text-amber-600 bg-amber-50",
  },
  violet: {
    text: "text-gray-900",
    bg: "bg-violet-50",
    ring: "",
    glow: "",
    badge: "text-violet-600 bg-violet-50",
  },
};

export function StatCard({ label, value, icon, color, change, subtitle }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div
      className={`bg-white rounded-xl p-5 border border-surface-border card-hover ${c.ring ? `ring-2 ${c.ring}` : ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold ${c.text} mt-1 data-number`}>{value}</p>
        </div>
        <div
          className={`w-14 h-14 rounded-xl ${c.bg} flex items-center justify-center ${c.glow}`}
        >
          <FontAwesomeIcon icon={icon} className={`${c.text === "text-gray-900" ? "text-violet-600" : c.text} text-xl`} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {change && (
          <span className={`${c.badge} px-2 py-0.5 rounded`}>{change}</span>
        )}
        {subtitle && <span className="text-gray-400">{subtitle}</span>}
      </div>
    </div>
  );
}
