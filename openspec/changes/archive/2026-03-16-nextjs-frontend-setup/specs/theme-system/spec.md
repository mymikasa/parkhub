## ADDED Requirements

### Requirement: 主题配置

系统 SHALL 支持亮色/暗色主题切换。

#### Scenario: 主题提供者
- **WHEN** 应用启动
- **THEN** 根布局包含 ThemeProvider 组件
- **AND** 主题状态持久化到 localStorage

#### Scenario: 默认主题
- **WHEN** 用户首次访问
- **THEN** 默认使用亮色主题 (light)
- **OR** 跟随系统主题偏好 (prefers-color-scheme)

### Requirement: 主题切换

系统 SHALL 提供主题切换功能。

#### Scenario: 主题切换按钮
- **WHEN** 用户点击主题切换按钮
- **THEN** 在亮色和暗色主题之间切换
- **AND** 切换过程平滑过渡

#### Scenario: 主题持久化
- **WHEN** 用户切换主题
- **THEN** 主题偏好保存到 localStorage
- **AND** 刷新页面后保持用户选择的主题

### Requirement: CSS 变量

系统 SHALL 使用 CSS 变量定义主题颜色。

#### Scenario: 亮色主题变量
- **WHEN** 使用亮色主题
- **THEN** 以下 CSS 变量 SHALL 定义：
  - --background: 0 0% 100%
  - --foreground: 222.2 84% 4.9%
  - --card: 0 0% 100%
  - --card-foreground: 222.2 84% 4.9%
  - --primary: 221.2 83.2% 53.3%
  - --primary-foreground: 210 40% 98%

#### Scenario: 暗色主题变量
- **WHEN** 使用暗色主题
- **THEN** CSS 变量自动切换为暗色值
- **AND** 组件样式自动更新

### Requirement: 品牌色系统

系统 SHALL 定义品牌色系统，与设计稿保持一致。

#### Scenario: 品牌色配置
- **WHEN** 查看主题配置
- **THEN** 以下品牌色 SHALL 定义：
  - brand-50: #eff6ff
  - brand-100: #dbeafe
  - brand-500: #3b82f6
  - brand-600: #2563eb
  - brand-700: #1d4ed8
  - brand-900: #1e3a5f

#### Scenario: Surface 色配置
- **WHEN** 查看主题配置
- **THEN** 以下 Surface 色 SHALL 定义：
  - surface: #ffffff
  - surface-muted: #f8fafc
  - surface-border: #e2e8f0

### Requirement: 特殊样式效果

系统 SHALL 支持设计稿中定义的特殊样式效果。

#### Scenario: 渐变按钮
- **WHEN** 渲染主要操作按钮
- **THEN** 使用渐变背景 `linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)`
- **AND** 悬停时有阴影和上移效果

#### Scenario: 发光效果
- **WHEN** 需要突出显示状态
- **THEN** 支持 glow-green、glow-blue、glow-amber 发光效果

#### Scenario: 动画效果
- **WHEN** 需要动画效果
- **THEN** 支持以下动画：
  - pulse: 脉冲动画（状态点）
  - slideIn: 滑入动画（列表项）
  - float: 浮动动画（数据卡片）
