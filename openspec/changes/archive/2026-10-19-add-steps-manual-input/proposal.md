## Why

「今日」页步数卡当前只能依赖设备健康平台（Health Connect/HealthKit）自动读取，不支持手动输入；当平台不可用、权限被拒或偶发读取失败时，用户没有任何兜底手段补录或修正当日步数，活动消耗随之失真。

## What Changes

- 「今日」页步数卡新增编辑入口，打开自定义底部抽屉（沿用编辑抽屉视觉语言，禁用系统 Alert）手动录入当日查看日期的步数，写入 `step_log`（source=manual）。
- 手动值定位为该日用户显式覆盖值：平台自动同步 SHALL NOT 覆盖 source=manual 的行；步数卡提供「清除手动值」操作，删除该行后恢复平台权威与自动同步。
- 平台不可用、权限拒绝、读取失败等降级态下，步数卡同步展示手动录入入口作为兜底路径。
- 升级遗留的历史 manual 行从「只读保留」变为可正常编辑/清除。
- 步数消耗 kcal 保持纯派生值，手动录入/清除后随展示即时重算，无需额外存储。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `step-tracking`: 新增手动录入步数能力与 manual 行优先级规则；修改「平台值为唯一权威值」「自动同步平台步数」「存储每日设备步数」中与手动录入冲突的 requirement（平台同步跳过 manual 行、权限拒绝/平台不可用降级态提供手动录入入口、legacy manual 行可编辑）。

## Impact

- `src/services/stepService.ts`：新增 `recordManualSteps` / `clearStepRecord`（单事务 upsert/delete）；`recordPlatformSteps` 写入前跳过 source=manual 行。
- `src/hooks/useDeviceSteps.ts`：自动同步时机跳过当日已有 manual 记录的日期；暴露手动保存/清除方法并原地 refresh。
- `src/screens/IntakeScreen.tsx`：步数卡新增编辑入口；新增 `src/components/StepsEditDrawer.tsx` 底部抽屉（数字输入校验、保存、清除手动值）。
- `src/i18n/zh.ts` / `en.ts`：新增步数编辑抽屉双语文案。
- 备份/恢复：`step_log` 结构不变，备份结构无变化，天然兼容。
- 测试：`tests/stepService.test.ts`、`tests/energyBalance.test.ts` 补充 manual 优先级与清除恢复用例。
