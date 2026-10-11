## Why

「我的」页的「清空/重置全部数据」目前只有一种全量重置（清空全部记录 + 配置回默认 + 回首启引导）。用户最常见的诉求是只清掉饮食记录、保留目标配置与食物库继续记录，但现有单一入口无法满足，只能"全清后再走一遍引导"。与导出数据已支持双选项（JSON 备份 / CSV 明细）保持一致的交互语言，把清空也升级为分级选择。

## What Changes

- 「清空/重置全部数据」点击后，ActionSheet 从单一确认模式改为**双选项模式**（与导出数据抽屉同视觉语言）：
  - **仅清空摄入记录**：删除全部 `intake_log`；保留配置（目标/身体参数）、步数记录、食物库；不触发首启引导
  - **清空全部数据并重置**：沿用现有 `resetEverything()` 行为（全部表清空 + 配置默认 + 回引导 + 重新播种）
- 选择任一选项后仍进入**红色危险二次确认抽屉**（文案按所选范围区分），确认后才执行；取消无副作用
- 数据层新增 `clearIntakeLogs()`（单事务仅删 `intake_log`）与服务层 `clearIntakeData()`；`resetEverything()` 行为不变
- i18n 新增 en/zh 文案键（选项标题、副标题、两种确认文案）
- UI 文案双语齐全，无硬编码中文

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `data-management`: 「清空与重置全部数据」需求扩展为分级清空——新增"仅清空摄入记录"路径（保留配置/步数/食物库、不回引导），保留原"全部重置"路径；两者均需二次确认

## Impact

- `src/db/database.ts`：新增 `clearIntakeLogs()`
- `src/services/dataService.ts`：新增 `clearIntakeData()`
- `src/screens/ProfileScreen.tsx`：reset ActionSheet 改为选项模式 + 按范围二次确认
- `src/components/ActionSheet.tsx`：无改动（复用现有 options / confirm 两种模式）
- `src/i18n/{en,zh}.ts`：新增文案键
- 无数据库 schema 变更、无新依赖；现有 64 个 vitest 不受影响
