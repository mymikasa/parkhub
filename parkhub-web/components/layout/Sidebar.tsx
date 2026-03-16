"use client";

import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/auth/store";
import { usePermissions } from "@/lib/auth/hooks";
import { Icon } from "@/components/icons/FontAwesome";
import {
  faSquareParking,
  faBuilding,
  faWarehouse,
  faMicrochip,
  faCalculator,
  faChartLine,
  faListCheck,
  faDesktop,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { NavItem } from "./NavItem";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Sidebar() {
  const router = useRouter();
  const { user, logout } = useAuthContext();
  const permissions = usePermissions();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navGroups = [
    ...(permissions.isPlatformAdmin
      ? [
          {
            title: "平台管理",
            items: [
              { href: "/tenant-management", icon: <Icon icon={faBuilding} />, label: "租户管理" },
            ],
          },
        ]
      : []),
    {
      title: "车场运营",
      items: [
        { href: "/parking-lot", icon: <Icon icon={faWarehouse} />, label: "停车场管理" },
        { href: "/device-management", icon: <Icon icon={faMicrochip} />, label: "设备管理" },
        { href: "/billing-rules", icon: <Icon icon={faCalculator} />, label: "计费规则" },
      ],
    },
    {
      title: "运营监控",
      items: [
        { href: "/realtime-monitor", icon: <Icon icon={faChartLine} />, label: "实时监控" },
        { href: "/entry-exit-records", icon: <Icon icon={faListCheck} />, label: "出入记录" },
        { href: "/operator-workspace", icon: <Icon icon={faDesktop} />, label: "操作员工作台" },
      ],
    },
  ];

  return (
    <aside className="w-64 sidebar-gradient fixed h-full flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Icon icon={faSquareParking} className="text-white text-base" />
          </div>
          <span className="text-white text-lg font-semibold">ParkHub</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="px-3 mb-2">
              <span className="text-xs font-medium text-blue-200/50 uppercase tracking-wider px-3">
                {group.title}
              </span>
            </div>
            {group.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
              />
            ))}
            <div className="mt-6" />
          </div>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-sm font-medium">
              {user?.real_name?.[0] || "万"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user?.real_name || "万科物业"}</div>
            <div className="text-blue-200/60 text-xs">
              {user?.role === 'platform_admin' ? '平台管理员' : 
               user?.role === 'tenant_admin' ? '租户管理员' : '操作员'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/50 hover:text-white/80 transition-colors"
          >
            <Icon icon={faRightFromBracket} />
          </button>
        </div>
      </div>
    </aside>
  );
}
