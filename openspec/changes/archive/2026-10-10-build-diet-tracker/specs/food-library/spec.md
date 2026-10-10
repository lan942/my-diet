## ADDED Requirements

### Requirement: 内置优质食物分类
系统 SHALL 预置以下食物分类（首次启动时种子写入）：碳水、蛋白质、脂肪、抗氧化蔬菜、膳食纤维。每个分类有 name 与 sort_order，支持排序展示。

#### Scenario: 首次启动预置分类
- **WHEN** 应用首次启动且数据库为空
- **THEN** 系统写入 5 个分类，食物库页按 sort_order 展示

### Requirement: 标注低 GI 碳水
系统 SHALL 对食物条目支持 gi 字段（整数或空）。碳水分类中 GI ≤ 55 的食物 SHALL 在 UI 上标注「低 GI」。

#### Scenario: 低 GI 碳水展示标注
- **WHEN** 碳水分类中燕麦 gi=55
- **THEN** 食物库页该条目展示「低 GI」标签

#### Scenario: 高 GI 不标注
- **WHEN** 白米饭 gi=73
- **THEN** 该条目不展示「低 GI」标签

### Requirement: 管理食物条目
系统 SHALL 允许用户对每个分类新增、编辑、删除食物条目，每条含 name、category_id、kcal/100g、protein/100g、carb/100g、fat/100g、gi(可选)、notes。营养值必须为非负数。

#### Scenario: 新增食物
- **WHEN** 用户在蛋白质分类新增「鸡胸肉」kcal/100g=165、protein=31、carb=0、fat=3.6
- **THEN** 系统保存并在蛋白质分类下展示该条目

#### Scenario: 拒绝负数营养值
- **WHEN** 用户录入 protein/100g = -5
- **THEN** 系统拒绝并提示「营养值必须为非负数」

#### Scenario: 删除被引用的食物
- **WHEN** 用户删除一个已被 intake_log 引用的食物
- **THEN** 系统拒绝删除并提示「该食物已被摄入记录引用，无法删除」

### Requirement: 按分类筛选食物
系统 SHALL 允许用户在食物库页按分类筛选展示食物列表。

#### Scenario: 筛选某分类
- **WHEN** 用户选择「抗氧化蔬菜」分类
- **THEN** 列表仅展示该分类下的食物条目
