## 1. 数据与服务层

- [x] 1.1 `src/db/database.ts` 新增 `clearIntakeLogs()`：单事务 `DELETE FROM intake_log`，不动步数/食物/配置
- [x] 1.2 `src/services/dataService.ts` 新增 `clearIntakeData()` 薄封装（无需播种；`resetEverything()` 保持原样）

## 2. i18n 双语文案

- [x] 2.1 `src/i18n/en.ts` / `src/i18n/zh.ts` 新增键：范围选择抽屉标题（`settings.resetScopeTitle`）、两个选项 label/sub（`settings.resetIntake{,Sub}` / `settings.resetAll{,Sub}`）、仅摄入确认三键（`settings.resetIntakeConfirm{Title,Msg,Action}`）；原 `settings.resetConfirm*` 保留给"全部重置"路径

## 3. UI 接线

- [x] 3.1 `src/screens/ProfileScreen.tsx`：reset 流改为两段式——action 拆为范围选择（options 模式：仅摄入 icon `restaurant-outline` tint `macroColors.calorie`；全部 icon `trash-outline` tint `colors.danger`）→ 按范围渲染对应 confirm 抽屉（confirmDanger）；仅摄入路径确认后 `clearIntakeData()` + `refresh()`（原地更新，不动 loading）
- [x] 3.2 自查：无系统 Alert、无硬编码文案、触觉反馈与既有入口一致（Light impact）

## 4. 质量与验证

- [x] 4.1 `npx tsc --noEmit` 与 `expo lint` 通过；现有 64 个 vitest 全过（无新增纯逻辑，不新增用例）
- [x] 4.2 `openspec validate --change clear-intake-data-option` 通过

## 5. 版本与交付

- [x] 5.1 版本号手动同步：`app.json` 与 `android/app/build.gradle` 升为 v1.6.3 / versionCode 21
- [x] 5.2 `.\gradlew.bat assembleRelease` 构建（跳过 clean），验证 BUILD SUCCESSFUL
- [x] 5.3 打包 `my-diet-v1.6.3.zip` 交付微信传输
