## 1. 数据库迁移

- [x] 1.1 创建 `parking_lots` 表迁移文件（包含 id, tenant_id, name, address, total_spaces, lot_type, status 字段）
- [x] 1.2 创建 `gates` 表迁移文件（包含 id, parking_lot_id, name, type, device_id 字段）
- [x] 1.3 添加必要的索引（tenant_id, parking_lot_id, 唯一约束）
- [x] 1.4 执行数据库迁移并验证

## 2. 后端 Domain 层

- [x] 2.1 创建 `internal/domain/parking_lot.go` 实体定义
- [x] 2.2 创建 `internal/domain/gate.go` 实体定义
- [x] 2.3 定义 `LotType` 和 `ParkingLotStatus` 枚举
- [x] 2.4 定义 `GateType` 枚举

## 3. 后端 Repository 层

- [x] 3.1 创建 `ParkingLotRepository` 接口定义
- [x] 3.2 实现 `ParkingLotRepository` PostgreSQL 实现
- [x] 3.3 创建 `GateRepository` 接口定义
- [x] 3.4 实现 `GateRepository` PostgreSQL 实现
- [x] 3.5 实现统计聚合查询方法

## 4. 后端 Service 层

- [x] 4.1 创建 `ParkingLotService` 接口定义
- [x] 4.2 实现 `ParkingLotService` 业务逻辑（CRUD + 多租户隔离）
- [x] 4.3 实现车场名称唯一性校验
- [x] 4.4 实现车位数修改时在场车辆校验
- [x] 4.5 创建 `GateService` 接口定义
- [x] 4.6 实现 `GateService` 业务逻辑
- [x] 4.7 实现出入口删除时的通行记录校验

## 5. 后端 Handler 层

- [x] 5.1 创建 `ParkingLotHandler` 处理器
- [x] 5.2 实现 GET /api/v1/parking-lots 列表接口
- [x] 5.3 实现 GET /api/v1/parking-lots/stats 统计接口
- [x] 5.4 实现 GET /api/v1/parking-lots/{id} 详情接口
- [x] 5.5 实现 POST /api/v1/parking-lots 创建接口
- [x] 5.6 实现 PUT /api/v1/parking-lots/{id} 更新接口
- [x] 5.7 实现 DELETE /api/v1/parking-lots/{id} 删除接口（预留）
- [x] 5.8 创建 `GateHandler` 处理器
- [x] 5.9 实现 GET /api/v1/parking-lots/{id}/gates 出入口列表接口
- [x] 5.10 实现 POST /api/v1/parking-lots/{id}/gates 添加出入口接口
- [x] 5.11 实现 PUT /api/v1/gates/{id} 编辑出入口接口
- [x] 5.12 实现 DELETE /api/v1/gates/{id} 删除出入口接口

## 6. 后端路由与中间件

- [x] 6.1 注册停车场相关路由
- [x] 6.2 配置 RBAC 权限控制（平台管理员只读、租户管理员读写）
- [x] 6.3 应用多租户数据隔离中间件

## 7. 后端 Wire 依赖注入

- [x] 7.1 创建 Repository Wire ProviderSet
- [x] 7.2 创建 Service Wire ProviderSet
- [x] 7.3 创建 Handler Wire ProviderSet
- [x] 7.4 运行 Wire 生成依赖注入代码

## 8. 后端 OpenAPI 文档

- [x] 8.1 更新 openapi.yaml 添加停车场管理接口定义
- [x] 8.2 添加请求/响应 Schema 定义
- [x] 8.3 添加错误响应定义

## 9. 前端类型定义

- [x] 9.1 创建 `lib/parking-lot/types.ts` 类型定义
- [x] 9.2 创建 `types/gate.ts` 类型定义
- [x] 9.3 创建 `types/parking-lot-stats.ts` 类型定义

## 10. 前端 API 层

- [x] 10.1 创建 `lib/parking-lot/api.ts` API 调用函数
- [x] 10.2 实现获取停车场列表 API
- [x] 10.3 实现获取统计数据 API
- [x] 10.4 实现创建停车场 API
- [x] 10.5 实现更新停车场 API
- [x] 10.6 实现获取出入口列表 API
- [x] 10.7 实现添加/编辑/删除出入口 API

## 11. 前端页面与布局

- [x] 11.1 创建 `/parking-lot` 路由页面 `app/parking-lot/page.tsx`
- [x] 11.2 实现页面整体布局（侧边栏 + 主内容区）
- [x] 11.3 实现 `ParkingLotHeader` 头部组件（标题 + 描述 + 搜索框 + 新建按钮）

## 12. 前端统计卡片区

- [x] 12.1 创建 `StatsCards` 统计卡片容器组件
- [x] 12.2 实现单个统计卡片组件（图标 + 数值 + 标签）
- [x] 12.3 实现加载骨架屏
- [x] 12.4 实现数值千位分隔符格式化

## 13. 前端车场卡片列表

- [x] 13.1 创建 `ParkingLotList` 卡片列表容器组件
- [x] 13.2 创建 `ParkingLotCard` 车场卡片组件
- [x] 13.3 实现车场图标容器（渐变背景 + FontAwesome 图标）
- [x] 13.4 实现 `StatusBadge` 状态标签组件（运营中/暂停运营 + 呼吸点动画）
- [x] 13.5 实现数据统计块（3 列网格）
- [x] 13.6 实现 `UsageProgressBar` 使用率进度条组件
- [x] 13.7 实现进度条颜色变化逻辑（绿/黄/红/灰）
- [x] 13.8 实现底部操作栏（出入口统计 + 操作按钮）
- [x] 13.9 实现 hover 上浮和阴影增强效果

## 14. 前端新建/编辑车场弹窗

- [x] 14.1 创建 `CreateLotDialog` 新建车场弹窗组件
- [x] 14.2 实现表单字段（名称、地址、车位数、类型）
- [x] 14.3 集成 react-hook-form + zod 验证
- [x] 14.4 实现提交状态管理（loading、禁用输入）
- [x] 14.5 实现成功/失败 Toast 提示
- [x] 14.6 创建 `EditLotDialog` 编辑车场弹窗组件
- [x] 14.7 实现运营状态切换开关
- [x] 14.8 实现暂停运营二次确认

## 15. 前端出入口配置弹窗

- [x] 15.1 创建 `GateConfigDialog` 出入口配置弹窗组件
- [x] 15.2 实现出入口列表展示
- [x] 15.3 实现入口/出口图标区分（绿色/蓝色）
- [x] 15.4 实现设备在线状态展示
- [x] 15.5 实现离线设备红色高亮
- [x] 15.6 实现添加出入口内联表单
- [x] 15.7 实现编辑出入口内联编辑
- [x] 15.8 实现删除出入口二次确认

## 16. 前端搜索功能

- [x] 16.1 实现搜索输入框组件
- [x] 16.2 实现 500ms 防抖处理
- [x] 16.3 实现搜索结果实时更新
- [x] 16.4 实现无结果空状态展示

## 17. 测试与验证

- [x] 17.1 后端单元测试：Repository 层
- [x] 17.2 后端单元测试：Service 层
- [x] 17.3 后端集成测试：API 端点
- [x] 17.4 前端组件测试：核心组件
- [x] 17.5 E2E 测试：完整业务流程
- [x] 17.6 多租户数据隔离验证
- [x] 17.7 权限控制验证（平台管理员只读）

## 18. 文档与部署

- [x] 18.1 更新 README.md 添加停车场管理模块说明
- [x] 18.2 更新部署文档
- [x] 18.3 准备种子数据（测试停车场和出入口）
