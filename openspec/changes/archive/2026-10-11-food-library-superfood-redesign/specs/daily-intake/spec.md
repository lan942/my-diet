## ADDED Requirements

### Requirement: 从食物库快捷记录摄入
系统 SHALL 支持在食物库 Quick Log 抽屉中完成摄入记录：份量选择（预设克数快捷片 50/100/150/200g + 连续滑杆，默认 100g）与餐次选择（早/午/晚/加餐，默认按当前时段推断），点击 Add to Today 后以当天日期写入 intake_log 并刷新今日汇总；全程停留在食物库页，不发生页面跳转。

#### Scenario: 一键记录 150g
- **WHEN** 用户在鸡胸肉 Quick Log 抽屉选择 150g、餐次=午餐，点击 Add to Today
- **THEN** 系统写入 intake_log(date=今天, food_item_id=鸡胸肉, grams=150, meal=午餐)，今日汇总随之更新

#### Scenario: 抽屉内营养预览
- **WHEN** 用户在 Quick Log 抽屉调整份量
- **THEN** 抽屉实时预览该份量对应的热量与三大营养素（per-100g × grams/100），配色沿用宏量营养素语义色

#### Scenario: 非法份量拒绝
- **WHEN** Quick Log 提交的 grams ≤ 0 或非数字
- **THEN** 系统拒绝并提示「克数必须为正数」

#### Scenario: 记录成功反馈
- **WHEN** Add to Today 成功
- **THEN** 抽屉关闭，给出轻量成功反馈（Light 触觉反馈 + 轻提示），用户停留在食物库页
