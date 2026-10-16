## Why

当前底部 4 个 Tab 中「步数」是一个独立的手动录入页：用户需要自己输入步数、手动点同步，功能与「今日」的热量统计割裂——步数换算的消耗热量对当日热量预算没有任何影响，用户感知不到「多走一步」的价值。设备健康平台（Health Connect / HealthKit）已能自动提供权威步数，独立 Tab + 手动录入既增加操作负担，也让产品焦点分散。

## What Changes

- **BREAKING（导航结构）**：移除底部「步数」Tab，主导航由 4 Tab（今日/食物库/步数/我的）收敛为 3 Tab（今日/食物库/我的），删除 StepScreen 页面及其手动录入、步数历史列表 UI。
- 步数改为**设备权威数据源**：用户在「今日」页首次主动点击「连接健康应用」完成授权后，应用在进入今日页、App 回前台、切换日期时自动从平台读取步数（支持任意历史日期的日界聚合，不再只读当天）；任何弹窗/入口仍遵守「启动不索权、权限仅用户主动触发」的合规约束。
- **动态热量预算 + 净热量整合**：「今日」页新增步数卡片（步数、≈消耗 kcal、同步状态），热量进度条的目标改为 `当日目标 + 步数消耗`，并展示净热量（摄入 − 步数消耗）与剩余预算；蛋白质/碳水/脂肪目标不变。
- 步数消耗公式由固定 `steps × 0.04` 升级为与体重挂钩：`steps_kcal = round(steps × 0.0005 × weight_kg)`。
- 降级策略：平台不可用或用户拒绝授权时，不提供手动录入入口，步数以 0/占位「—」展示，卡片保留连接入口与用途说明；升级前已存在的 manual 历史步数记录仍正常展示。
- 数据层保留 `step_log` 表（一天一条、source 标记、备份/恢复字段）；平台同步语义简化为**平台值权威覆盖**（不再保留「manual 当日保护」规则），手动录入服务接口随 UI 一并移除。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `step-tracking`: 能力重定义——从「独立步数页手动录入 + 历史列表 + 手动触发同步」改为「设备平台步数自动采集（含历史日期）+ 体重相关消耗估算」，移除手动录入要求与步数页要求，平台值为唯一权威值。
- `daily-intake`: 「今日」页新增步数卡片与能量平衡整合（动态热量目标 = TDEE 目标 + 步数消耗、净热量展示、剩余预算）。
- `user-profile`: 底部导航要求从 4 Tab 改为 3 Tab（今日/食物库/我的）。
- `onboarding`: 引导完成后落地的主界面表述由四 Tab 改为三 Tab（流程本身不变）。
- `device-adaptation`: 涉及「步数页/步数录入/遍历四个 Tab」的适配场景表述同步为三 Tab 与今日页步数卡。
- `localization`: 涉及「查看步数历史」的场景表述同步（日期/数字格式化要求本身不变）。

## Impact

- **UI/导航**：`App.tsx`（Tab 由 4→3、移除 Steps 路由与图标/文案映射）、删除 `src/screens/StepScreen.tsx`、`src/screens/IntakeScreen.tsx`（新增步数卡与能量平衡 UI）、新增 `src/hooks/useDeviceSteps.ts`（可用性探测/自动同步编排）。
- **服务层**：`platformSteps.ts/.android.ts/.ios.ts`（接口扩展为按日期读取，`todayDayRange` 泛化为任意日期日界）、`stepService.ts`（移除手动 upsert、同步改为平台权威覆盖、`stepsToKcal(steps, weightKg)`）、新增能量平衡纯计算（`energyBalance` 或并入 targetService）、iOS 原生 Swift 模块 `NutriPulseHealth` 新增按日期读取方法（iOS 构建仍挂起，待 macOS）。
- **状态/数据**：`AppContext` 继续加载 `step_logs`（无需结构性迁移，旧 manual 行只读保留）；`schema.ts` 无变更；`dataService` 备份结构不变。
- **i18n**：移除 `tab.steps` 及步数录入/历史相关 key，新增连接、同步状态、净热量、调整后预算等双语 key（en/zh）。
- **测试/交付**：vitest 覆盖新公式、能量平衡计算、按日期时间窗、权威覆盖语义、自动同步编排；版本号递增（v1.9.0 / versionCode 28），构建 APK 并打包 ZIP。
