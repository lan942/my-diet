## MODIFIED Requirements

### Requirement: 录入每日步数
系统 SHALL 允许用户在「步数」页录入某一天（YYYY-MM-DD）的步数（非负整数）。同一天再次录入 SHALL 覆盖该天记录（一天仅一条）。读取既有记录与写入（UPDATE/INSERT）SHALL 在单个数据库事务内完成，并发/重复提交 SHALL NOT 产生同一天的重复行。

#### Scenario: 首次录入当日步数
- **WHEN** 用户录入 2026-10-10 步数 8000
- **THEN** 系统保存该天步数记录 8000

#### Scenario: 同天再次录入覆盖
- **WHEN** 用户对 2026-10-10 再次录入 9500
- **THEN** 该天步数更新为 9500，不产生两条

#### Scenario: 拒绝负数步数
- **WHEN** 用户录入步数 -100
- **THEN** 系统拒绝并提示「步数必须为非负数」

#### Scenario: 并发覆盖不产生重复行
- **WHEN** 对同一天几乎同时触发两次保存
- **THEN** 该天仅存在一条步数记录（读取—判断—写入在同一事务内完成）

### Requirement: 自动同步平台步数
系统 SHALL 支持从平台健康接口自动读取**所选日期本地日界（本地时间 00:00:00.000–23:59:59.999）**的步数：聚合请求的起止时间串 SHALL 携带本地时区偏移（`±HH:mm`），SHALL NOT 使用不带偏移的 ISO 串（Android Health Connect `Instant.parse` 对无偏移串必然拒绝）。Android 经 Health Connect（Android 14+ 原生内置，低版本经 Play Services 兼容），iOS 经 HealthKit。读取结果 SHALL 写入现有步数存储（覆盖式语义不变），并标记来源（manual/platform）。平台步数 SHALL NOT 覆盖用户当日已手动录入的记录。权限请求 SHALL 仅在用户主动触发同步时发起，SHALL NOT 在应用启动时索权。平台初始化、SDK 状态查询、权限请求或数据聚合任一环节失败 SHALL NOT 被缓存为永久失败，用户再次触发同步时 SHALL 重新尝试。同步入口 SHALL 仅在查看当天日期时展示，查看历史日期时 SHALL NOT 展示同步卡片；应用由后台回到前台时 SHALL 重新探测一次平台可用性。同步写入完成后页面 SHALL 重新读取当日记录再展示。

#### Scenario: Android 授权后同步当日步数
- **WHEN** 用户在步数页点击「同步步数」并授予 Health Connect 权限
- **THEN** 聚合请求携带本地时区偏移的当日时间窗，当日步数记录更新为 Health Connect 读取的总步数，来源标记为 platform

#### Scenario: iOS 经 HealthKit 同步当日步数
- **WHEN** iOS 用户在步数页点击「同步步数」并授予 HealthKit 读取权限
- **THEN** 当日步数记录更新为 HealthKit 当日步数总和，来源标记为 platform

#### Scenario: 手动录入优先于自动同步
- **WHEN** 用户当日已手动录入 8000 步后再触发平台同步（平台读得 6500）
- **THEN** 当日记录保持 8000（manual 来源），不被平台值覆盖

#### Scenario: 权限拒绝降级手动录入
- **WHEN** 用户拒绝平台健康权限
- **THEN** 应用不崩溃，步数页仍可手动录入（现有要求不变），并展示引导开启的文案

#### Scenario: 平台不可用降级
- **WHEN** 设备不支持 Health Connect（且无 Play Services）或非双平台运行
- **THEN** 同步入口不展示（或展示不可用说明），手动录入功能不受影响

#### Scenario: 历史日期不展示同步入口
- **WHEN** 用户在步数页切换到昨天或更早日期
- **THEN** 平台同步卡片不展示，仅可手动录入/编辑该日步数

#### Scenario: 初始化失败后再次同步可重试
- **WHEN** 首次同步时平台初始化失败，用户稍后再次点击「同步步数」
- **THEN** 系统重新初始化并正常发起权限/聚合流程，不复用首次的失败结果

#### Scenario: 回前台重新探测可用性
- **WHEN** 用户去系统设置授予 Health Connect 权限后返回应用
- **THEN** 应用重新探测平台可用性，同步入口反映最新状态
