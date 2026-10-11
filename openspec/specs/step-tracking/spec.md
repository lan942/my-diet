## Purpose
记录每日步数，按天录入（覆盖式），估算消耗热量并展示历史。

## Requirements

### Requirement: 录入每日步数
系统 SHALL 允许用户在「步数」页录入某一天（YYYY-MM-DD）的步数（非负整数）。同一天再次录入 SHALL 覆盖该天记录（一天仅一条）。

#### Scenario: 首次录入当日步数
- **WHEN** 用户录入 2026-10-10 步数 8000
- **THEN** 系统保存该天步数记录 8000

#### Scenario: 同天再次录入覆盖
- **WHEN** 用户对 2026-10-10 再次录入 9500
- **THEN** 该天步数更新为 9500，不产生两条

#### Scenario: 拒绝负数步数
- **WHEN** 用户录入步数 -100
- **THEN** 系统拒绝并提示「步数必须为非负数」

### Requirement: 估算步数消耗热量
系统 SHALL 按步数估算消耗热量（steps_kcal = steps * 0.04），并在步数页展示，标注「≈消耗」。

#### Scenario: 展示消耗估算
- **WHEN** 当日步数 10000
- **THEN** 步数页展示「≈消耗 400 kcal」

### Requirement: 展示步数历史
系统 SHALL 在步数页展示步数历史记录列表（按日期倒序）。

#### Scenario: 历史列表
- **WHEN** 数据库有 10-10、10-09 两条步数记录
- **THEN** 步数页列表按日期倒序展示这两条

### Requirement: 自动同步平台步数
系统 SHALL 支持从平台健康接口自动读取当日步数：Android 经 Health Connect（Android 14+ 原生内置，低版本经 Play Services 兼容），iOS 经 HealthKit。读取结果 SHALL 写入现有步数存储（覆盖式语义不变），并标记来源（manual/platform）。平台步数 SHALL NOT 覆盖用户当日已手动录入的记录。权限请求 SHALL 仅在用户主动触发同步时发起，SHALL NOT 在应用启动时索权。

#### Scenario: Android 授权后同步当日步数
- **WHEN** 用户在步数页点击「同步步数」并授予 Health Connect 权限
- **THEN** 当日步数记录更新为 Health Connect 读取的总步数，来源标记为 platform

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

### Requirement: 平台步数权限用途文案
应用 SHALL 在请求健康数据权限前展示用途说明；iOS Info.plist SHALL 配置英文权限说明（与 store-release 规格一致）；Android SHALL 仅申请读取 Steps 数据所需的最低权限，SHALL NOT 申请写入或心率高阶权限。

#### Scenario: 权限申请前说明
- **WHEN** 用户首次点击「同步步数」
- **THEN** 应用先以当前语言展示步数用途说明（英文系统下为英文），再触发系统权限弹窗

#### Scenario: 权限最小化
- **WHEN** 审查 Android 权限声明
- **THEN** 仅包含读取步数类权限（READ_STEPS），无写入健康数据或无关敏感权限
