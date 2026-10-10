## ADDED Requirements

### Requirement: 记录当日食物摄入
系统 SHALL 允许用户在「今日」页选择食物库中的食物，录入克数（grams，正数）与餐次（早/午/晚/加餐），保存为当日 intake_log（date=YYYY-MM-DD）。

#### Scenario: 成功记录摄入
- **WHEN** 用户选择鸡胸肉 200g，餐次=午餐，当天为 2026-10-10
- **THEN** 系统保存 intake_log(date=2026-10-10, food_item_id, grams=200, meal=午餐)

#### Scenario: 拒绝零或负克数
- **WHEN** 用户录入 grams = 0
- **THEN** 系统拒绝并提示「克数必须为正数」

### Requirement: 汇总当日营养摄入
系统 SHALL 按当日所有 intake_log，结合各食物的 per-100g 营养值，汇总当天总热量、蛋白质、碳水、脂肪，并在「今日」页展示。

#### Scenario: 多条摄入汇总
- **WHEN** 当日有鸡胸肉 200g（165 kcal/100g）与燕麦 50g（389 kcal/100g）
- **THEN** 当日总热量 = 165*2 + 389*0.5 = 524.5 kcal

### Requirement: 与当日目标对比展示达成率
系统 SHALL 将当日汇总与当日目标（由最新体重与配置计算）对比，展示热量/蛋白质/碳水/脂肪的达成率（百分比）。

#### Scenario: 展示达成率
- **WHEN** 当日蛋白质摄入 80g，当日蛋白质目标 105g
- **THEN** 蛋白质达成率显示约 76.2%

### Requirement: 删除当日摄入记录
系统 SHALL 允许用户删除某条当日摄入记录，删除后重新汇总当日营养。

#### Scenario: 删除后重新汇总
- **WHEN** 用户删除当日鸡胸肉 200g 这条记录
- **THEN** 当日热量与蛋白质汇总随之减少并刷新展示

### Requirement: 按日切换查看历史
系统 SHALL 允许用户在「今日」页切换日期，查看历史某一天的摄入记录与达成率。默认展示当天。

#### Scenario: 切换到昨天
- **WHEN** 用户选择 2026-10-09
- **THEN** 页面展示 2026-10-09 的摄入记录与当日汇总
