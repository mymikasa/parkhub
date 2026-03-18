## ADDED Requirements

### Requirement: 支持按车场名称和地址搜索
系统 SHALL 允许用户通过搜索框按车场名称和地址进行模糊匹配搜索。

#### Scenario: 成功搜索到结果
- **WHEN** 用户在搜索框输入关键词
- **AND** 等待 500ms 防抖后
- **THEN** 系统返回匹配的停车场卡片列表
- **AND** 匹配车场名称或地址中的关键词

#### Scenario: 模糊匹配不区分大小写
- **WHEN** 用户输入"万科"
- **THEN** 系统返回所有名称或地址包含"万科"的停车场
- **AND** 不区分大小写

#### Scenario: 空搜索词显示全部
- **WHEN** 用户清空搜索框
- **THEN** 系统显示本租户所有停车场

#### Scenario: 无匹配结果显示空状态
- **WHEN** 用户输入的关键词无匹配结果
- **THEN** 显示空状态提示"未找到匹配的停车场"

### Requirement: 搜索输入防抖
系统 SHALL 对搜索输入进行 500ms 防抖处理，避免频繁 API 调用。

#### Scenario: 防抖生效
- **WHEN** 用户连续快速输入多个字符
- **THEN** 系统仅在用户停止输入 500ms 后发起 API 请求
- **AND** 不会为每个字符发起请求

### Requirement: 搜索性能要求
系统 SHALL 确保搜索 API 的 P95 响应时间小于 500ms。

#### Scenario: 搜索性能达标
- **WHEN** 调用 GET /api/v1/parking-lots?search={keyword}
- **THEN** 响应时间 P95 < 500ms
- **AND** 返回匹配的停车场列表
