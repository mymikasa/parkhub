## Context

停车场管理是 ParkHub 平台的核心基础模块，位于租户管理的下游、设备管理/计费规则的上游。当前平台已完成租户管理、用户认证、RBAC 权限控制等基础能力，需要新增停车场管理以支撑完整的停车运营闭环。

**约束条件：**
- 前端：Next.js 15 App Router + shadcn/ui + Tailwind CSS
- 后端：Go + Gin + Wire 依赖注入 + 清洁架构
- 数据库：PostgreSQL
- 多租户数据隔离必须强制执行

## Goals / Non-Goals

**Goals:**
- 实现停车场完整 CRUD（创建、查看、编辑、删除、状态切换）
- 实现出入口配置管理（添加、编辑、删除、设备绑定）
- 实现统计数据聚合展示
- 实现搜索功能
- 严格的多租户数据隔离
- 高保真 UI 还原设计稿

**Non-Goals:**
- 停车场删除功能（Phase 3，本次仅预留接口）
- 分页功能（Phase 2）
- 卡片图标/颜色自定义（Phase 3）
- 实时剩余车位同步（依赖设备心跳，Phase 2）

## Decisions

### 1. 数据模型设计

**决策：** 采用 `parking_lots` 和 `gates` 两表设计，一对多关系。

**理由：**
- 出入口独立成表，便于扩展（如添加设备状态、通行统计）
- 符合清洁架构的聚合根设计，ParkingLot 为聚合根
- 支持未来出入口级别的权限控制

**表结构：**
```
parking_lots: id, tenant_id, name, address, total_spaces, lot_type, status
gates: id, parking_lot_id, name, type(entry|exit), device_id
```

### 2. API 路由设计

**决策：** 采用 RESTful 嵌套路由。

**理由：**
- 出入口作为停车场的子资源，语义清晰
- 符合现有 API 规范（OpenAPI 3.0）
- 便于权限控制（车场级别 + 出入口级别）

**路由设计：**
```
GET    /api/v1/parking-lots              # 列表
GET    /api/v1/parking-lots/stats        # 统计
GET    /api/v1/parking-lots/{id}         # 详情
POST   /api/v1/parking-lots              # 创建
PUT    /api/v1/parking-lots/{id}         # 更新
DELETE /api/v1/parking-lots/{id}         # 删除
GET    /api/v1/parking-lots/{id}/gates   # 出入口列表
POST   /api/v1/parking-lots/{id}/gates   # 添加出入口
PUT    /api/v1/gates/{id}                # 编辑出入口
DELETE /api/v1/gates/{id}                # 删除出入口
```

### 3. 前端组件架构

**决策：** 采用组件化设计，分为页面级、容器级、原子级三层。

**理由：**
- 与现有前端架构保持一致
- 便于复用（如统计卡片、进度条组件）
- 支持渐进式加载

**组件划分：**
```
pages/
└── parking-lot/page.tsx           # 页面入口
components/parking-lot/
├── parking-lot-header.tsx         # 头部区域
├── stats-cards.tsx                # 统计卡片区
├── parking-lot-card.tsx           # 车场卡片
├── parking-lot-list.tsx           # 卡片列表
├── usage-progress-bar.tsx         # 使用率进度条
├── status-badge.tsx               # 状态标签
├── create-lot-dialog.tsx          # 新建弹窗
├── edit-lot-dialog.tsx            # 编辑弹窗
└── gate-config-dialog.tsx         # 出入口配置弹窗
```

### 4. 剩余车位计算策略

**决策：** Phase 1 使用数据库字段 `available_spaces` 存储，由后端定时任务或事件驱动更新。

**理由：**
- Phase 1 不依赖实时设备数据，简化实现
- 字段存储便于快速查询和统计
- 为 Phase 2 实时同步预留扩展点

**替代方案：** 每次查询实时计算 `total_spaces - COUNT(在场车辆)`，但性能较差。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 剩余车位数据不够实时 | Phase 1 接受延迟，Phase 2 引入事件驱动更新 |
| 出入口删除时存在未完成通行记录 | API 返回 403 错误，前端提示用户 |
| 车场名称同租户重复 | 数据库唯一约束 + API 返回 409 |
| 跨租户访问 | 中间件强制过滤 tenant_id，API 返回 403 |
| 前端弹窗状态管理复杂 | 使用 react-hook-form + 独立 Dialog 组件 |

## Migration Plan

1. **Phase 1 部署：**
   - 执行数据库迁移创建 `parking_lots` 和 `gates` 表
   - 部署后端 API
   - 部署前端页面和组件
   - 无需数据迁移（新功能）

2. **回滚策略：**
   - 数据库：执行 down 迁移删除表
   - 后端：回滚到上一版本
   - 前端：回滚到上一版本

## Open Questions

1. ~~剩余车位是否需要实时同步？~~ → Phase 1 使用字段存储，延迟可接受
2. ~~车场图标和颜色是否支持自定义？~~ → Phase 3 功能
3. ~~是否需要分页？~~ → Phase 2 实现，当前按创建时间倒序返回全部
