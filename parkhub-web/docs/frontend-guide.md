# 前端开发指南

## 目录结构

```
parkhub-web/
├── app/                      # Next.js App Router 页面
│   ├── (dashboard)/           # 已认证页面的路由组
│   │   ├── layout.tsx        # 带有 Sidebar 的仪表盘布局
│   │   ├── page.tsx          # 仪表盘重定向到 /realtime-monitor
│   │   ├── tenant-management/ # 仅平台管理员
│   │   ├── parking-lot/      # 租户管理员页面
│   │   ├── device-management/ # 设备管理
│   │   ├── billing-rules/    # 计费配置
│   │   ├── realtime-monitor/  # 实时监控
│   │   ├── entry-exit-records/ # 历史记录
│   │   ├── operator-workspace/ # 操作员工作台
│   │   └── payment/         # H5 支付页面
│   ├── login/                 # 登录页面
│   └── layout.tsx             # 带有 ThemeProvider 的根布局
├── components/                # React 组件
│   ├── ui/                   # shadcn/ui 组件
│   ├── layout/                # 布局组件（Sidebar、Header）
│   ├── icons/                 # 自定义图标组件
│   ├── ThemeProvider.tsx      # 主题上下文
│   ├── ThemeToggle.tsx        # 暗/亮模式切换
│   └── shared/               # 共享组件
├── lib/                     # 工具函数
│   ├── utils.ts              # 辅助函数
│   ├── constants.ts           # 应用常量
│   └── fontawesome.ts        # FontAwesome 配置
├── hooks/                   # 自定义 React hooks
├── types/                   # TypeScript 类型定义
├── public/                  # 静态资源
├── components.json            # shadcn 配置
├── tsconfig.json             # TypeScript 配置
├── tailwind.config.ts         # Tailwind 配置
├── next.config.ts            # Next.js 配置
└── package.json              # 依赖
```

## 开发命令

```bash
cd parkhub-web

# 安装依赖
pnpm install

# 开发服务器（http://localhost:3000）
pnpm dev

# 生产构建
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint
```

## 代码示例

### 页面布局模板

```tsx
// app/(dashboard)/example/page.tsx
import { Card } from "@/components/ui/card";

export default function ExamplePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">页面标题</h1>
      <Card>
        {/* 内容 */}
      </Card>
    </div>
  );
}
```

### 表单处理（react-hook-form + zod）

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  username: z.string().min(1, "请输入账号"),
  password: z.string().min(6, "密码至少6位"),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

### API 客户端模式

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

export const api = {
  auth: {
    login: (data: LoginRequest) => fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  }
};
```

### FontAwesome 集成

```tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faUser } from "@fortawesome/free-solid-svg-icons";

<FontAwesomeIcon icon={faCar} />
```

### 主题配置

```tsx
// components/ThemeProvider.tsx
import { ThemeProvider as NextThemesProvider } from "next-themes";

<NextThemesProvider attribute="class" defaultTheme="light">
  {children}
</NextThemesProvider>
```

### 加载状态

```tsx
<div className="animate-pulse bg-muted h-4 w-full" />
```

### 空状态

```tsx
<div className="flex flex-col items-center justify-center py-12">
  <p className="text-muted-foreground">暂无数据</p>
</div>
```

### 类型定义示例

```typescript
// types/user.ts
export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  realName: string;
  role: 'platform_admin' | 'tenant_admin' | 'operator';
  tenantId?: string;
}
```

## 性能考虑

- 尽可能在服务端组件中获取数据
- 为长列表实现虚拟滚动
- 使用图片优化（`next/image`）
- 适当的情况下懒加载路由和组件
- 对搜索输入进行防抖（500ms）
