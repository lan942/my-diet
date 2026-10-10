## 1. 工程初始化

- [x] 1.1 初始化 Expo TypeScript 工程：生成 `package.json`、`tsconfig.json`、`app.json`、`index.ts`，依赖对齐 my-fin-app（expo 57、react 19.2、react-native 0.86、expo-sqlite、@react-navigation/bottom-tabs、@expo/vector-icons、react-native-safe-area-context、react-native-screens、vitest）
- [x] 1.2 添加 `vitest.config.mts`、`eslint.config.js`，复用 my-fin-app 配置风格
- [x] 1.3 初始化本地 Git 仓库并提交工程骨架

## 2. 数据层

- [x] 2.1 编写 `src/types.ts`：WeightRecord、FoodCategory、FoodItem、IntakeLog、StepLog、AppConfig(系数与比例)、TargetResult(热量/蛋白质/三大宏量)
- [x] 2.2 编写 `src/db/schema.ts`：weight_record、food_category、food_item、intake_log、step_log、app_config 建表 DDL（含索引，幂等）
- [x] 2.3 编写 `src/db/database.ts`：单例连接 + WAL + 建表 + `nowString()` + `todayString()`（YYYY-MM-DD）

## 3. 服务层

- [x] 3.1 编写 `src/services/configStore.ts`：DEFAULT_CONFIG（kcal_per_kg=30, protein_per_kg=1.5, 比例 0.5/0.25/0.25）、validateConfig（比例和=1）、load/saveConfig
- [x] 3.2 编写 `src/services/weightService.ts`：listWeights、createWeight（正数校验）、最新体重查询；抛 WeightError
- [x] 3.3 编写 `src/services/targetService.ts`：按最新体重+配置算热量/蛋白质/碳水/脂肪目标；无体重返回 null
- [x] 3.4 编写 `src/services/foodService.ts`：分类 CRUD、食物条目 CRUD（营养值非负、删除引用拦截、低 GI 标注辅助）、种子数据写入；抛 FoodError
- [x] 3.5 编写 `src/services/intakeService.ts`：listIntake(date)、createIntake（grams 正数）、deleteIntake、汇总当日营养（按 grams/per100g 现算）；抛 IntakeError
- [x] 3.6 编写 `src/services/stepService.ts`：upsertStep(date, steps)（非负、覆盖）、listSteps；抛 StepError；步数热量换算 steps_kcal=steps*0.04

## 4. 全局状态与主题

- [x] 4.1 编写 `src/theme.ts`：colors/spacing（复用 my-fin-app，新增 warn/ok 色用于达成率）
- [x] 4.2 编写 `src/state/AppContext.tsx`：config + weights + categories + foodItems + intakeLogs + stepLogs + loading + refresh + currentDate/setCurrentDate

## 5. 组件

- [x] 5.1 编写 `src/components/Card.tsx`、`src/components/ui.tsx`（输入框、按钮、行操作等，复用 my-fin-app 风格）
- [x] 5.2 编写 `src/components/DateBar.tsx`：日期切换条（今日/历史翻页）
- [x] 5.3 编写 `src/components/ProgressBar.tsx`：达成率进度条

## 6. 页面与导航

- [x] 6.1 编写 `src/screens/WeightScreen.tsx`：录入体重、列表、目标展示（热量/蛋白质/三大宏量，标注「估算」）
- [x] 6.2 编写 `src/screens/FoodLibraryScreen.tsx`：分类筛选、食物列表（低 GI 标签）、新增/编辑/删除食物
- [x] 6.3 编写 `src/screens/IntakeScreen.tsx`（今日）：选食物录克数与餐次、当日汇总、达成率、按日切换、删除记录
- [x] 6.4 编写 `src/screens/StepScreen.tsx`：录入当日步数（覆盖）、消耗估算、历史列表
- [x] 6.5 编写 `src/screens/SettingsScreen.tsx`：调整 kcal_per_kg、protein_per_kg、三大宏量比例（和=1 校验）
- [x] 6.6 编写 `App.tsx`：5 底部 Tab（体重/食物库/今日/步数/设置），AppProvider 包裹，复用 my-fin-app 的 tabIcon 风格

## 7. 测试

- [x] 7.1 为 configStore（比例校验）、targetService（目标公式）写 vitest 单测
- [x] 7.2 为 foodService（低 GI 标注、删除引用拦截）、intakeService（汇总计算）写单测
- [x] 7.3 运行 `npm test` 与 `npm run typecheck` 全部通过

## 8. 构建与交付

- [ ] 8.1 `eas.json` 与 android 构建配置，本地 `expo prebuild` + 出 APK
- [ ] 8.2 通过微信传文件将 APK 传输到手机安装测试
- [ ] 8.3 验证四项核心功能在真机可跑，Git 提交最终代码
