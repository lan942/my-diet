## Why

「今日」页的当日摄入记录列表目前只支持删除，不支持编辑。用户记错克数（如把 150g 记成 200g）或记错餐次时，只能先删除再重新录入整条记录，操作链路长且容易在重录时再次出错；历史日期回看时同样无法就地修正。需要为已存在的摄入记录提供就地编辑能力。

## What Changes

- intakeService 新增 `updateIntake(id, { grams, meal })`：仅更新克数与餐次两列，沿用与新增一致的克数校验（正数），食物与日期不可变更
- 「今日」页摄入记录行新增编辑入口（铅笔图标，与删除按钮并列），点击拉起编辑抽屉
- 编辑抽屉复用 Quick Log 的双模式交互（生活化份量 ⇄ 精确克数 + 餐次分段 + 实时营养预览），打开时预填当前克数与餐次：
  - 食物含 portions 预设且当前克数能由某锚点 × 合法数量（0.5–8、步进 0.5）精确换算得到时，预填份量模式并选中对应锚点与数量
  - 其余情况预填精确克数模式并选中当前克数
- 提交走与 Quick Log 一致的 sheet-interactions 约束：保存进行中锁定关闭通道、失败保留抽屉并展示本地化错误、成功才关闭并轻提示
- 保存成功后原地刷新当日列表与汇总；编辑历史日期的记录时日期保持不变，不发生任何跳转

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `daily-intake`: 新增「编辑当日摄入记录」需求——已存在的 intake_log 行可就地修改克数与餐次（食物与日期不可变），复用 Quick Log 双模式编辑抽屉，沿用删除确认之外的统一抽屉交互约束

## Impact

- **代码**：`src/services/intakeService.ts`（新增 updateIntake）、`src/screens/IntakeScreen.tsx`（记录行编辑入口 + 抽屉接线）、`src/components/QuickLogSheet.tsx`（扩展支持编辑模式：初始值预填、标题/按钮文案切换、提交回调区分新增/编辑）、`src/i18n/zh.ts` / `src/i18n/en.ts`（编辑相关文案）
- **测试**：intakeService 新增 updateIntake 校验与更新用例；QuickLogSheet 编辑模式预填逻辑（份量锚点反解）纯函数用例
- **无 schema / 数据迁移**：仅 UPDATE 既有列，备份/恢复格式不变
- **无破坏性变更**：删除流程保持现状不变
