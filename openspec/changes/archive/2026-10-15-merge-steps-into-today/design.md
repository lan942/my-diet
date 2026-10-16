## Context

应用当前为 4 Tab 结构（今日/食物库/步数/我的）。步数能力（`step-tracking`）由独立页面 `StepScreen.tsx` 承载：手动文本录入 + 步数历史列表 + 用户手动点击的平台同步（Health Connect / HealthKit，仅读当日）。服务层已具备：

- `platformSteps.ts`（零 RN 依赖的接口/降级实现 + `toOffsetISO`/`todayDayRange`/`parseStepsAggregate` 纯函数）、`platformSteps.android.ts`（Health Connect 聚合当日）、`platformSteps.ios.ts` + `NutriPulseHealthModule.swift`（HealthKit 读当日）；
- `stepService.ts`：`step_log` 一天一条、事务 upsert、`syncPlatformSteps`（manual 当日保护、platform 取大值）、`stepsToKcal = steps × 0.04`；
- `AppContext` 已全局加载 `stepLogs`；备份/恢复已含 step_logs。

本次变更把步数从「独立录入页」改造为「设备自动采集的能量平衡输入」，涉及导航、服务接口、同步编排、今日页 UI、i18n、iOS 原生模块，属跨模块变更。

## Goals / Non-Goals

**Goals:**

- 底部导航收敛为 3 Tab（今日/食物库/我的），删除 StepScreen 与全部手动步数录入 UI。
- 授权一次后，步数在今日页焦点、回前台、切日时自动从平台读取；支持任意历史日期的本地日界聚合。
- 步数成为该日唯一权威值；旧 manual 数据保留只读。
- 今日页形成能量平衡视图：调整后目标 = TDEE 目标 + 步数消耗；净热量 = 摄入 − 步数消耗；剩余 = 调整后目标 − 摄入。
- 步数消耗按体重估算：`round(steps × 0.0005 × weight_kg)`。

**Non-Goals:**

- 不做后台/定时同步（无任务调度、无推送），仅在 App 前台、今日页可见时同步。
- 不做步数目标/打卡成就、不做步数趋势图/周报。
- 不改 `step_log` 表结构与备份格式（v1 不变）。
- 不重做今日页环形仪表盘（本次只新增步数卡与能量平衡行，ProgressBar 体系不变）。
- iOS 原生工程不在 Windows 构建：Swift 侧代码随变更修改，iOS prebuild/回归继续挂起待 macOS。

## Decisions

### D1：平台值为唯一权威值，取消 manual 保护语义

`stepService` 改为只暴露平台写入：`recordPlatformSteps(date, steps)`（内部事务 upsert，source 恒为 `platform`），删除 `upsertStep` 手动接口。平台返回什么就存什么（含数值下降，适配数据源更正/换设备），不再「manual 保护」也不再「platform 取大值」。`StepSource` 类型保留（旧行仍可能是 manual，备份往返与 mapRow 逻辑不变）。

- 备选：保留 manual 保护 → 否决。手动入口删除后保护规则会让升级用户当日的旧 manual 行永远挡住设备数据；且与「单一权威值」契约冲突（参见类似计步系统的教训：同一指标多源写入必然漂移）。
- 事务/非负校验/`ERR_INVALID_STEPS` 保留，备份结构零改动，回滚只需回退应用代码。

### D2：平台接口泛化为按日期读取

- `platformSteps.ts`：`todayDayRange(now?)` 泛化出 `dayRangeForDate(date: string, now?)`（本地日界 + 时区偏移，纯函数可单测）；接口方法 `readTodaySteps()` 替换为 `readStepsForDate(date: string)`；`todayDayRange` 保留为薄封装（当日 = `dayRangeForDate(today)`）供调用与既有测试迁移。
- Android：`aggregateRecord` 的 timeRangeFilter 直接用任意日期的 range，无额外限制。
- iOS：Swift 模块新增 `AsyncFunction("readStepsForDate")`，接收 "YYYY-MM-DD"，用 `Calendar.dateComponents` 构造该日 `[startOfDay, nextDay)` 谓词。TS 侧做能力探测：原生方法缺失（旧原生包未重新 prebuild）时，当日回退 `readTodaySteps`，历史日期返回 null（降级不崩）。

### D3：自动同步编排收敛为 `useDeviceSteps(date)` 单一 hook

新增 `src/hooks/useDeviceSteps.ts`（项目首个 hooks 目录），今日页唯一的步数数据出口，返回：

```ts
{
  availability: 'available' | 'update_required' | 'unavailable' | 'unknown';
  syncState: 'idle' | 'syncing' | 'connected' | 'denied' | 'unavailable';
  steps: number | null;        // 当前查看日期的步数（step_log 派生 + 同步后即时更新）
  connect: () => Promise<void>; // 唯一会触发系统权限弹窗的入口
  syncNow: () => Promise<void>; // 已连接用户的手动刷新
}
```

行为要点：

1. **探测不索权**：挂载时与 AppState `active` 时调 `availability()`；自动读取只调 `readStepsForDate`（拒绝时返回 null，不弹窗）。
2. **自动触发时机**：`useFocusEffect`（今日页 focus）+ AppState active + `date` 变化，且 availability=available。
3. **单飞 + 序号**：在途请求按日期合并（同日期并发只发一次）；维护递增 seq，切日后先返回的旧结果丢弃（复用 IntakeScreen summarySeq 的既有模式）。
4. **节流**：同一日期距上次成功读取不足 15s 跳过（focus 与 active 在冷启动回切时会同时触发）。
5. **连接状态持久化**：`app_config` 增加独立 KV 标志 `steps_connection = 'connected'`（用户主动 connect 且 requestPermissions 返回 true 时写入）；未置位时只要当日无本地行就展示连接卡片，置位后自动读取静默运行；用户在系统设置撤销权限导致读取失败时，syncNow 暴露 denied 文案与重新连接入口。
6. 写入成功后调用 `refresh()`（**严禁 setLoading**，沿用 AppContext 既有铁律，避免导航树卸载跳 Tab）。

- 备选：把编排放进 AppContext 全局同步 → 否决。食物库/我的页无需步数，全局轮询浪费且 AppState 逻辑分散；hook 与今日页生命周期绑定最简单。

### D4：能量平衡为纯函数服务

新增 `src/services/energyBalance.ts`（零 RN 依赖）：

```ts
stepsToKcal(steps: number, weightKg: number): number            // round(steps * 0.0005 * weightKg)
computeEnergyBalance(args: {
  targetKcal: number; intakeKcal: number; steps: number | null; weightKg: number;
}): { stepsKcal: number; adjustedCalorie: number; remaining: number; netKcal: number }
```

`stepService.stepsToKcal` 旧固定系数函数删除（迁移现有测试到新服务）。UI 全部数值从该纯函数派生，不持久化；体重/摄入/步数任一变化经 render 即时重算（useMemo，不入 effect）。

- 系数依据：常用步行估算 0.0005 kcal/步/kg；70kg 人 1 万步 ≈ 350 kcal，与旧固定 0.04/步（400 kcal）量级一致但随个体化档案变化。
- 蛋白质/碳水/脂肪目标不动，避免用户误读「走路可以多吃蛋白配额」。

### D5：今日页 UI 结构

IntakeScreen 在 DateBar 与「达成率」卡之间新增**步数卡**：

- connected：青色 footsteps 图标 + 步数大数字（允许 2× 字体缩放）+ `≈ 350 kcal` + 右侧小型同步按钮（syncing 时转圈）与状态文案；
- available 未连接：用途说明（复用 `sync.rationale`）+ Connect 按钮；
- denied：说明 + 重新连接按钮 + 错误文案（Toast/行内，沿用现有非 Alert 模式）；
- unavailable：紧凑不可用说明（不隐藏整张卡，保留功能可发现性，但不抢眼）；
- 历史日期：同一卡展示该日数据；已连接自动补读；未连接时显示本地既有行（旧 manual 行可见）。

「达成率」卡：热量 ProgressBar 的 target 传 `adjustedCalorie`，副标题/注脚一行展示 `净热量 X · 剩余 Y kcal`（双语 key），让调整口径可见；其余三条宏量卡不变。所有弹窗/反馈复用 Toast/ActionSheet 体系，不引入 Alert。

### D6：i18n 与清理

- 删除：`tab.steps`、`steps.today/inputTitle/label/labelPh/saveOverwrite/history/empty`。
- 新增（en/zh 双写）：`steps.cardTitle`、`steps.connect`、`steps.syncing`、`steps.lastSynced`（如需要）、`steps.unavailable`、`steps.notConnected`、`energy.net`、`energy.remaining`、`energy.adjustedHint`。
- 复用：`sync.rationale/sync.success/sync.denied/sync.unavailable/sync.protected`（sync.protected 随 manual 保护一并删除）。
- 删除文件：`src/screens/StepScreen.tsx`；`App.tsx` 移除 Steps 路由/TAB_ICONS/TAB_KEYS 项，`RootTabParamList` 收敛 3 项。

## Risks / Trade-offs

- **[HealthKit 无法查询读权限状态]** → 以本地 `steps_connection` 标志 + 读取结果作为事实来源；撤销授权后读取为 null/0，用户点同步按钮时暴露 denied 文案与重连路径；不因此阻塞自动流程。
- **[iOS 原生方法缺失（旧包未 prebuild）]** → TS 侧探测方法存在性：当日回退 readTodaySteps、历史日期返回 null，功能降级不崩溃；iOS 构建/回归挂起，正式发版前在 macOS 补齐验证。
- **[focus + active 事件重复触发读取]** → 15s 节流 + 同日期单飞；seq 令牌保证快速切日不串数据。
- **[历史日期聚合范围过大导致卡顿]** → 仅在用户主动切到该日时按需读取单日窗口，不批量回填；读完落库，之后直接走本地行。
- **[旧固定系数用户感知变化（1 万步 400→350 kcal@70kg）]** → 新公式更个体化且差异有限；文案不承诺精度，仅标注估算值。
- **[升级后旧 manual 当日行被覆盖]** → 这是预期内的权威收敛；历史 manual 行在被平台读取前完整保留展示，备份数据无丢失。

## Migration Plan

1. 无 schema 变更、无数据迁移、无备份版本号变化（`BACKUP_VERSION=1`）。
2. 覆盖安装：旧 `step_log`（含 manual）原样可读；已授权用户（v1.8 时代点过同步的人）首次进入今日页自动同步并逐步把行更新为 platform；未授权用户看到连接卡。
3. 回滚策略：回退应用代码即可——表与备份从未改动，旧版本仍能读取全部行（source 列本来就允许 manual/platform）。
4. 发版：v1.9.0 / versionCode 28（app.json + android/app/build.gradle 三处同步），tsc/lint/vitest/openspec validate 全过后构建 APK 并打 ZIP。

## Open Questions

无。整合口径（动态预算 + 净热量）、降级策略（不做手动录入）、历史补读（按日期自动读）均已在提案阶段确认。
