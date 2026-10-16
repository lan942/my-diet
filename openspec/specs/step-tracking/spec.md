## Purpose
自动采集设备健康平台（Android Health Connect / iOS HealthKit）的每日步数，本地按天留存快照，按用户体重估算活动消耗并输入今日页能量平衡统计；平台值为唯一权威源，支持历史日期补读查看。
## Requirements
### Requirement: 估算步数消耗热量
系统 SHALL 按步数与用户当前体重估算活动消耗：`steps_kcal = round(steps × 0.0005 × weight_kg)`，其中 weight_kg 取 AppConfig.weight_kg。该估算值 SHALL 为展示层纯派生值（SHALL NOT 持久化），体重配置或步数变化后展示 SHALL 即时重算。步数为 0 或当日无记录时 steps_kcal SHALL 为 0。

#### Scenario: 按体重估算消耗
- **WHEN** 用户体重 70 kg，当日步数 10000
- **THEN** 步数消耗 = round(10000 × 0.0005 × 70) = 350 kcal

#### Scenario: 体重变化即时重算
- **WHEN** 同日同步数 10000，用户体重由 70 kg 改为 80 kg
- **THEN** 步数消耗重算为 round(10000 × 0.0005 × 80) = 400 kcal，无需重新同步

#### Scenario: 无步数时消耗为零
- **WHEN** 当日无步数记录（或步数为 0）
- **THEN** 步数消耗为 0 kcal，不影响当日热量预算

### Requirement: 自动同步平台步数
系统 SHALL 支持从平台健康接口读取**任意日历日期本地日界（本地时间 00:00:00.000–23:59:59.999）**的步数：聚合请求的起止时间串 SHALL 携带本地时区偏移（`±HH:mm`），SHALL NOT 使用不带偏移的 ISO 串（Android Health Connect `Instant.parse` 对无偏移串必然拒绝）。Android 经 Health Connect，iOS 经 HealthKit。

首次系统权限请求 SHALL 仅由用户在「今日」页步数卡主动点击连接/同步入口触发，SHALL NOT 在应用启动或页面自动加载时弹出系统授权弹窗。获得授权后，系统 SHALL 在以下时机自动读取**当前查看日期**的步数并写入存储，无需用户再次点击：今日页获得焦点（挂载/Tab 导航 focus）、应用由后台回到前台（AppState 变为 active）、日期切换到新的一天。自动读取 SHALL 具备单飞与序号防护：同一日期的并发读取 SHALL 合并为一次；快速切换日期时先返回的旧日期结果 SHALL NOT 覆盖新日期的展示与写入。平台初始化、SDK 状态查询、权限状态或数据聚合任一环节失败 SHALL NOT 被缓存为永久失败，下一次触发时机 SHALL 重新尝试；失败 SHALL NOT 影响摄入记录等页面其余功能。步数卡 SHALL 反映同步状态（未连接 / 同步中 / 已同步 / 平台不可用）；未授权时的自动读取 SHALL 静默跳过（SHALL NOT 触发权限弹窗）并展示连接入口。

#### Scenario: Android 主动连接授权后同步当日步数
- **WHEN** 用户在今日页步数卡点击连接并授予 Health Connect 权限
- **THEN** 聚合请求携带本地时区偏移的当日时间窗，当日步数记录更新为 Health Connect 读取的总步数，来源标记为 platform

#### Scenario: iOS 经 HealthKit 同步当日步数
- **WHEN** iOS 用户在今日页步数卡点击连接并授予 HealthKit 读取权限
- **THEN** 当日步数记录更新为 HealthKit 当日步数总和，来源标记为 platform

#### Scenario: 授权后进入页面与回前台自动同步
- **WHEN** 用户已授权，随后再次冷启动进入今日页，或切到其他 App 后回到前台
- **THEN** 系统自动发起当日步数读取与写入，用户无需点击任何同步按钮

#### Scenario: 切换历史日期自动补读
- **WHEN** 已授权用户在今日页切换到 2026-10-08
- **THEN** 系统以该日期本地日界（带时区偏移）的时间窗向平台发起聚合读取，并将结果写入/更新该日步数记录

#### Scenario: 平台值为唯一权威值
- **WHEN** 平台两次读取当日步数分别为 9000、8800（数据源更正导致数值下降）
- **THEN** 当日记录以最后一次平台值 8800 为准并标记 platform

#### Scenario: 快速切日旧结果不覆盖新日期
- **WHEN** 用户快速从 A 日切到 B 日，A 日的平台聚合结果晚于 B 日返回
- **THEN** 展示与存储均以 B 日结果为准，A 日结果被丢弃

#### Scenario: 自动加载不索权
- **WHEN** 从未授权的用户启动应用并进入今日页
- **THEN** 系统不弹出任何健康权限弹窗，步数卡展示连接入口与用途说明

#### Scenario: 权限拒绝后降级展示
- **WHEN** 用户拒绝平台健康权限
- **THEN** 应用不崩溃，步数卡展示占位步数与重新连接入口及引导文案，不提供手动录入

#### Scenario: 平台不可用降级
- **WHEN** 设备不支持 Health Connect（且无 Play Services）或健康模块不可用
- **THEN** 步数卡展示不可用态（或仅展示连接不可用说明），今日页摄入记录等其余功能不受影响

#### Scenario: 失败后再次触发可重试
- **WHEN** 某次自动同步因平台临时故障失败，用户稍后回到前台或切换日期
- **THEN** 系统重新初始化并重新发起聚合流程，不复用、不缓存首次的失败结果

### Requirement: 平台步数权限用途文案
应用 SHALL 在请求健康数据权限前于「今日」页步数卡以当前语言展示步数用途说明（英文系统下为英文），再触发系统权限弹窗；iOS Info.plist SHALL 配置英文权限说明 `NSHealthShareUsageDescription`（与 store-release 规格一致，仅读不写，不声明 NSHealthUpdateUsageDescription）；Android SHALL 仅申请读取 Steps 数据所需的最低权限（READ_STEPS），SHALL NOT 申请写入健康数据或心率等高阶权限。

#### Scenario: 权限申请前说明
- **WHEN** 用户首次点击今日页步数卡的连接入口
- **THEN** 应用先展示当前语言的步数用途说明，再触发系统权限弹窗

#### Scenario: 权限最小化
- **WHEN** 审查 Android 权限声明
- **THEN** 仅包含读取步数类权限（READ_STEPS），无写入健康数据或无关敏感权限

### Requirement: 存储每日设备步数
系统 SHALL 在本地 SQLite `step_log` 表为每个有步数的日历日保存至多一条记录（`date` = YYYY-MM-DD UNIQUE，`steps` 非负整数，`source` = platform，`created_at`）。平台读取结果的写入（读取既有行→UPDATE/INSERT）SHALL 在单个数据库事务内完成，并发/重复同步 SHALL NOT 产生同一天的重复行。平台值 SHALL 为该日步数的唯一权威值：写入时 SHALL 覆盖该日既有行（包括升级遗留的 `manual` 行）并将 `source` 置为 `platform`。升级前已存在的 `manual` 历史行在被平台数据覆盖前 SHALL 继续只读展示，SHALL NOT 被迁移脚本删除。步数记录 SHALL 继续包含在全量备份/恢复数据中（备份结构不变）。

#### Scenario: 首次同步写入当日记录
- **WHEN** 平台读取 2026-10-15 步数为 7200，本地该日无记录
- **THEN** 系统在单事务内插入 step_log(date=2026-10-15, steps=7200, source=platform)

#### Scenario: 并发同步不产生重复行
- **WHEN** 同一天的两次同步几乎同时完成写入
- **THEN** 该日仅存在一条步数记录（读取—判断—写入在同一事务内）

#### Scenario: 平台值覆盖遗留手动记录
- **WHEN** 2026-10-15 存在升级遗留的 manual 记录 8000 步，平台当日读取为 6500 步
- **THEN** 该日记录更新为 6500、source 变为 platform（平台为唯一权威值，不再保护 manual）

#### Scenario: 历史手动记录只读保留
- **WHEN** 用户升级前在 2026-10-08 手动录入过 9000 步，升级后从未在该日触发平台读取
- **THEN** 该记录仍存在并在「今日」页切换到该日时展示，不被任何迁移删除

