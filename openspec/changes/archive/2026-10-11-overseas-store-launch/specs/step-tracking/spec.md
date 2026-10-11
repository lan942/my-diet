# step-tracking 变更规格

## ADDED Requirements

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
