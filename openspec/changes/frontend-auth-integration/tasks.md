## 1. 基础设施

- [x] 1.1 创建 `lib/auth/types.ts` 定义所有认证相关类型（User, LoginRequest, LoginResponse 等）
- [x] 1.2 创建 `lib/auth/api.ts` 实现所有认证 API 调用（login, smsLogin, sendSmsCode, refresh, logout, getCurrentUser）

## 2. 认证状态管理

- [x] 2.1 创建 `lib/auth/store.ts` 实现 AuthContext 和 Provider
- [x] 2.2 实现 Token 存储（localStorage）和读取逻辑
- [x] 2.3 实现 Token 自动刷新机制（请求拦截器 + 提前刷新）
- [x] 2.4 实现"记住我"功能（延长 Token 有效期）

## 3. 认证 Hooks

- [x] 3.1 创建 `lib/auth/hooks.ts` 实现 `useAuth()` Hook
- [x] 3.2 实现 `useUser()` Hook
- [x] 3.3 实现 `usePermissions()` Hook（基于角色返回权限布尔值）
- [x] 3.4 实现 `useRequireAuth()` Hook（未认证时重定向）

## 4. 登录页面

- [x] 4.1 创建 `app/(auth)/login/page.tsx` 登录页面
- [x] 4.2 实现账号密码登录表单（账号、密码、记住我）
- [x] 4.3 实现短信验证码登录表单（手机号、验证码、获取验证码按钮）
- [x] 4.4 实现登录方式 Tab 切换
- [x] 4.5 实现表单验证（zod safeParse）
- [x] 4.6 实现验证码 60 秒倒计时
- [x] 4.7 实现登录成功跳转和错误提示
- [x] 4.8 实现已登录用户重定向到首页

## 5. 路由保护

- [x] 5.1 创建 `middleware.ts` 实现 Next.js Middleware
- [x] 5.2 实现路由权限配置（基于角色）
- [x] 5.3 实现 Token 验证逻辑
- [x] 5.4 实现未认证重定向到登录页
- [x] 5.5 实现无权限重定向到 403 页面

## 6. 集成与测试

- [x] 6.1 在根布局中包裹 AuthProvider
- [x] 6.2 测试账号密码登录流程
- [ ] 6.3 测试短信验证码登录流程
- [ ] 6.4 测试 Token 刷新机制
- [ ] 6.5 测试路由保护（各角色权限）
- [ ] 6.6 测试登出流程
