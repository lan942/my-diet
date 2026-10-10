## Context

全新个人饮食/营养记录 app，无既有代码。架构、分层、主题风格直接复用 d:\my-fin-app（金融记账 app）：React Native + Expo SDK 57 + TypeScript，expo-sqlite 本地持久化（WAL + 幂等建表），@react-navigation/bottom-tabs 底部导航，React Context 全局状态，vitest 单测。需求来自用户：体重与每日热量/蛋白质目标、优质食物库、每日摄入统计、每日步数。

## Goals / Non-Goals

**Goals:**
- 复用 my-fin-app 的分层与样式风格，5 个底部 Tab 覆盖全部功能。
- 录入体重后自动算出每日热量与蛋白质目标，并按可配置比例拆分碳水/蛋白质/脂肪三大宏量。
- 内置优质食物分类与示例食物（碳水含低 GI 标注、蛋白质、脂肪、抗氧化蔬菜、膳食纤维），可增删改。
- 按天记录食物摄入量，汇总当天热量/蛋白质/碳水/脂肪并与目标对比。
- 按天记录步数，估算消耗热量。
- 全本地、离线可用，无后端。

**Non-Goals:**
- 不做账号/云同步/联网。
- 不做条形码扫描、拍照识别、第三方食物数据库导入。
- 不做运动记录（仅步数）。
- 不做 iOS 原生健康数据自动同步。
- 不做多用户。

## Decisions

### D1: 5 Tab 划分
体重 / 食物库 / 今日 / 步数 / 设置。理由：与 my-fin-app 5 Tab 节奏一致；「今日」作为首页聚合当日摄入与目标达成，最常用入口放中间。备选：合并步数进今日页，否决——步数是独立轻量记录，单独 Tab 更清晰。

### D2: 数据表设计
- `weight_record(id, weight_kg REAL, recorded_at TEXT)` —— 单表存历史体重，最新一条驱动目标计算。
- `food_category(id, name, sort_order)` 与 `food_item(id, name, category_id, kcal/100g, protein/100g, carb/100g, fat/100g, gi INTEGER NULL, notes, updated_at)` —— 分类与食物分离，方便分类筛选。低 GI 用 `gi <= 55` 标注。
- `intake_log(id, date TEXT, food_item_id, grams REAL, meal TEXT, created_at)` —— 按天记录摄入，grams 为实际克数；营养按 (grams/100)*per100g 现算。
- `step_log(id, date TEXT, steps INTEGER, created_at)` —— 每天一条，覆盖更新。
- `app_config(key, value)` —— 存比例配置 JSON。

备选：intake_log 内联食物快照（怕食物被删后历史丢失）。决定：用 food_item_id 外键，食物删除时若被引用则阻止删除（与 my-fin-app countHoldingByCategory 同模式）。

### D3: 热量/蛋白质目标公式
- `daily_calorie = weight_kg * kcal_per_kg`（默认 30）
- `daily_protein = weight_kg * protein_per_kg`（默认 1.5）
- 宏量拆分：`carb_ratio / protein_ratio / fat_ratio`（默认 0.5 / 0.25 / 0.25，和为 1）
- `carb_g = calorie * carb_ratio / 4`；`protein_g = calorie * protein_ratio / 4`；`fat_g = calorie * fat_ratio / 9`（4/9 为 kcal/g 常数）

公式系数与比例全部进 app_config 可调，设置页可改。理由：用户明确说「热量和蛋白质计算是一个比例」。

### D4: 步数热量换算
`steps_kcal = steps * 0.04`（每步约 0.04 kcal，粗估）。仅作参考展示，不做精确 BMR 叠加。

### D5: 复用 my-fin-app 的服务/状态/主题范式
- 服务层每个领域一个文件，抛出业务 Error 子类（如 `WeightError`、`FoodError`、`IntakeError`、`StepError`、`ConfigError`）。
- `AppContext` 持 config + weightList + foodCategories + foodItems + intakeLogs + stepLogs + loading + refresh + currentDate，与 my-fin-app 的 quarter 切换对应。
- theme.ts 复用 colors/spacing 结构，新增 `warn`/`ok` 色用于达成率对照。
- nowString() 复用 YYYY-MM-DD HH:mm:ss；日期键用 YYYY-MM-DD。

## Risks / Trade-offs

- [食物被引用后无法删除，导致食物库臃肿] → 删除前提示并阻止；或提供「归档」替代删除（本期不实现归档）。
- [目标公式为通用估算，不适用于特殊人群] → UI 标注「估算值，仅供参考」；系数可在设置调整。
- [步数与摄入热量单位易混淆（摄入 kcal vs 消耗 kcal）] → 步数页明确标「≈消耗」，今日页只聚合摄入达成率，不混入消耗。
- [初期无内置食物数据需手动录入] → 预置种子食物库（见 tasks），开箱即用。
