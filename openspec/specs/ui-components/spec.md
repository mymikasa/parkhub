## ADDED Requirements

### Requirement: shadcn/ui 初始化

系统 SHALL 集成 shadcn/ui 组件库，使用默认配置。

#### Scenario: 初始化 shadcn/ui
- **WHEN** 执行 shadcn/ui 初始化命令
- **THEN** 创建 components.json 配置文件
- **AND** 配置使用 TypeScript
- **AND** 配置样式方案为 default
- **AND** 配置基础路径为 @/components

### Requirement: 基础 UI 组件

系统 SHALL 安装并配置以下 shadcn/ui 基础组件：

- Button (按钮)
- Card (卡片)
- Dialog (对话框)
- Table (表格)
- Form (表单)
- Input (输入框)
- Select (选择器)
- Badge (徽章)
- Avatar (头像)
- Dropdown Menu (下拉菜单)
- Sheet (抽屉)
- Tabs (标签页)

#### Scenario: 组件安装
- **WHEN** 执行组件安装命令
- **THEN** 组件代码 SHALL 复制到 components/ui/ 目录
- **AND** 每个组件有独立的 index.ts 导出

#### Scenario: 组件使用
- **WHEN** 在页面中导入组件
- **THEN** 可以通过 @/components/ui/[component-name] 导入
- **AND** 组件样式与设计稿保持一致

### Requirement: FontAwesome 图标

系统 SHALL 配置 FontAwesome 作为图标库。

#### Scenario: FontAwesome 配置
- **WHEN** 项目初始化完成
- **THEN** FontAwesome 核心库和图标包 SHALL 已安装
- **AND** 支持 solid、regular、brands 三种样式

#### Scenario: 图标使用
- **WHEN** 在组件中使用图标
- **THEN** 可以通过 fa-solid、fa-regular、fa-brands 前缀访问图标
- **AND** 图标与设计稿中使用的图标一致

### Requirement: 自定义样式扩展

系统 SHALL 支持在 shadcn/ui 组件基础上扩展自定义样式。

#### Scenario: 自定义按钮样式
- **WHEN** 需要使用品牌按钮样式
- **THEN** Button 组件 SHALL 支持 btn-primary 变体
- **AND** 渐变背景 `linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)`
- **AND** 悬停时有阴影和上移效果

#### Scenario: 自定义卡片样式
- **WHEN** 需要使用数据卡片样式
- **THEN** Card 组件 SHALL 支持 card-hover 效果
- **AND** 悬停时有上移和阴影增强效果
