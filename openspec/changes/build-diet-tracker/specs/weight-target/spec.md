## ADDED Requirements

### Requirement: 录入体重记录
系统 SHALL 允许用户录入一条体重记录（单位 kg），并保存到本地数据库。同一天允许多条，保留历史。体重值必须为正数。

#### Scenario: 成功录入体重
- **WHEN** 用户在体重页输入 70.5 kg 并保存
- **THEN** 系统保存该记录（含本地时间戳），列表刷新显示最新记录

#### Scenario: 拒绝非正数体重
- **WHEN** 用户输入 0 或负数体重并保存
- **THEN** 系统拒绝保存并提示「体重必须为正数」

### Requirement: 计算每日热量与蛋白质目标
系统 SHALL 根据最新体重记录，结合可配置系数（kcal_per_kg 默认 30、protein_per_kg 默认 1.5）计算每日热量与蛋白质目标，并在体重页展示。若无体重记录，SHALL 提示先录入体重。

#### Scenario: 有体重记录时展示目标
- **WHEN** 最新体重为 70 kg，系数为默认值
- **THEN** 系统展示每日热量目标 2100 kcal、蛋白质目标 105 g

#### Scenario: 无体重记录时
- **WHEN** 数据库无任何体重记录
- **THEN** 系统提示「请先录入体重」且不展示目标数值

### Requirement: 按比例拆分三大宏量
系统 SHALL 按可配置比例（carb_ratio / protein_ratio / fat_ratio，默认 0.5/0.25/0.25，和为 1）将热量目标拆分为碳水/蛋白质/脂肪克数。比例和不为 1 时 SHALL 拒绝保存配置。

#### Scenario: 默认比例拆分
- **WHEN** 热量目标 2100 kcal，比例为 0.5/0.25/0.25
- **THEN** 碳水 262.5 g、蛋白质 131.25 g、脂肪 58.3 g（按 4/4/9 kcal·g⁻¹）

#### Scenario: 拒绝比例和不为 1
- **WHEN** 用户在设置页保存比例为 0.5/0.3/0.3（和 1.1）
- **THEN** 系统拒绝并提示「比例总和必须等于 100%」

### Requirement: 配置系数与比例可调
系统 SHALL 在设置页允许用户调整 kcal_per_kg、protein_per_kg 及三大宏量比例，保存后立即影响目标计算。

#### Scenario: 调整系数后目标更新
- **WHEN** 用户将 kcal_per_kg 从 30 改为 33，最新体重 70 kg
- **THEN** 每日热量目标更新为 2310 kcal
