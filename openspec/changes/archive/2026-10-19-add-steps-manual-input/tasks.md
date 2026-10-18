## 1. 服务层：手动值写入/清除与平台跳过

- [x] 1.1 `src/services/stepService.ts` 新增 `recordManualSteps(date, steps)`：校验非负整数 ≤ 100000（非法抛 `StepError(ERR.INVALID_STEPS)`），单事务 upsert 覆盖该日既有行（含 platform 行）并置 source=manual
- [x] 1.2 `src/services/stepService.ts` 新增 `clearStepRecord(date)`：单事务内删除该日 step_log 行
- [x] 1.3 `recordPlatformSteps` 事务内命中 `source='manual'` 既有行时直接返回该行、SHALL NOT 覆盖（返回值语义：返回实际生效的行）

## 2. Hook 层：自动同步跳过 manual 日

- [x] 2.1 `src/hooks/useDeviceSteps.ts` 的 `syncDate` 发起前检查当日 stepLogs 来源，`source==='manual'` 直接跳过（不发起平台调用、不计节流）
- [x] 2.2 `connect` 授权后强制同步路径与 `syncNow` 同样受 2.1 跳过逻辑保护（复用 syncDate，不重复实现）

## 3. UI 层：步数卡编辑入口与抽屉

- [x] 3.1 `src/screens/IntakeScreen.tsx` 步数卡右上角新增 pencil 编辑图标按钮（所有同步态可点，含 unavailable/denied 降级态），Light Impact 触觉反馈
- [x] 3.2 新增步数编辑抽屉（复用 `EditSheet` 壳）：标题/双语 hint、`TextInput`（number-pad、theme token 配色、maxFontSizeMultiplier）、预填当日当前值
- [x] 3.3 保存链路：前置校验（非负整数 ≤ 100000）→ `recordManualSteps` → `await refresh()`（禁 setLoading）→ 关抽屉 + 成功 Toast；失败经 EditSheet error prop 展示双语校验提示
- [x] 3.4 当日为 manual 时抽屉显示「清除手动值」次级文字按钮：`clearStepRecord` → `await refresh()` → 关抽屉；卡上 manual 行展示「手动/Manual」小胶囊来源标记
- [x] 3.5 已连接态下当日为 manual 时，点击刷新按钮给出 Toast「当日为手动录入，已跳过平台同步」（`handleSyncSteps` 前置判断）

## 4. 国际化与主题

- [x] 4.1 `src/i18n/zh.ts` / `en.ts` 新增步数编辑抽屉全部文案（标题、说明、占位、保存、清除手动值、校验提示、手动来源标签、跳过同步 Toast），双语同 key
- [x] 4.2 抽屉与来源标记配色全部走 `useTheme()` theme tokens，深浅色均适配

## 5. 测试与验证

- [x] 5.1 `tests/stepService.test.ts`：recordManualSteps 正常写入/覆盖 platform 行/非法输入抛错；clearStepRecord 删行；recordPlatformSteps 跳过 manual 行（保持 8000 不被 6500 覆盖）与清除后可恢复平台写入
- [x] 5.2 `tests/energyBalance.test.ts`：manual 来源步数同样派生 steps_kcal（6000 × 0.0005 × 70 = 210）
- [x] 5.3 运行 `npx tsc --noEmit`、lint、`npx vitest run` 全绿
- [x] 5.4 备份回归：现有备份/恢复用例确认 step_log 结构不变、往返无损（随 5.3 一起跑）
