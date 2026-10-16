## MODIFIED Requirements

### Requirement: 标注低 GI 碳水
系统 SHALL 对食物条目支持 gi 字段（0–100 的整数或空）。碳水分类中 0 ≤ GI ≤ 55 的食物 SHALL 在 UI 上标注「低 GI」；脏数据（负值或越界值）SHALL NOT 被判定为低 GI。

#### Scenario: 低 GI 碳水展示标注
- **WHEN** 碳水分类中燕麦 gi=55
- **THEN** 食物库页该条目展示「低 GI」标签

#### Scenario: 高 GI 不标注
- **WHEN** 白米饭 gi=73
- **THEN** 该条目不展示「低 GI」标签

#### Scenario: 脏数据负值不标注
- **WHEN** 某条食物因异常数据 gi=-5
- **THEN** 不展示「低 GI」标签（判定含 0 下界）

### Requirement: 管理食物条目
系统 SHALL 允许用户对每个分类新增、编辑、删除食物条目，每条含 name、category_id、kcal/100g、protein/100g、carb/100g、fat/100g、gi(可选)、notes。营养值必须为非负有限数。gi 若提供 SHALL 为 0–100 的整数（0 与 100 边界合法），服务层创建/更新与编辑表单 SHALL 对非整数、越界值统一拒绝并提示「GI 值必须是 0–100 的整数」。portions 若提供，每个条目 SHALL 满足 grams 为正有限数且 zh/en 标签均为非空字符串，否则 SHALL 拒绝保存。删除食物时的「是否被摄入记录引用」检查与删除动作 SHALL 在同一数据库事务内原子完成，SHALL NOT 出现检查通过但删除失败的可观察中间态。

#### Scenario: 新增食物
- **WHEN** 用户在蛋白质分类新增「鸡胸肉」kcal/100g=165、protein=31、carb=0、fat=3.6
- **THEN** 系统保存并在蛋白质分类下展示该条目

#### Scenario: 拒绝负数营养值
- **WHEN** 用户录入 protein/100g = -5
- **THEN** 系统拒绝并提示「营养值必须为非负数」

#### Scenario: 删除被引用的食物
- **WHEN** 用户删除一个已被 intake_log 引用的食物
- **THEN** 系统在事务内检查到引用并回滚，拒绝删除并提示「该食物已被摄入记录引用，无法删除」

#### Scenario: GI 边界值接受
- **WHEN** 用户保存碳水食物 gi=0 或 gi=100
- **THEN** 保存成功，gi=0 的食物可标注为低 GI

#### Scenario: 非法 GI 拒绝
- **WHEN** 用户提交 gi=101、gi=-1 或 gi=55.5
- **THEN** 编辑表单与服务层均拒绝并提示「GI 值必须是 0–100 的整数」

#### Scenario: 非法份量预设拒绝
- **WHEN** 食物 portions 含 grams=0、grams 为负数/NaN 或 zh/en 标签为空的条目
- **THEN** 系统拒绝保存该食物

### Requirement: 食物库快捷记录入口
系统 SHALL 在每张食物卡片右侧提供 [+] 快捷记录按钮，点击拉起轻量底部抽屉（Quick Log Sheet，复用 ActionSheet 视觉语言），内含该食物 100g 营养摘要、份量选择与餐次选择，一键写入当日摄入。抽屉交互 SHALL 满足 sheet-interactions 能力的关闭锁定与防重复触发要求。

#### Scenario: 点击加号拉起抽屉
- **WHEN** 用户点击鸡胸肉卡片的 [+] 按钮
- **THEN** 拉起 Quick Log 底部抽屉，展示鸡胸肉营养信息、份量选择与餐次选择

#### Scenario: 动画窗口连点不重复拉起或重复提交
- **WHEN** 用户在抽屉关闭动画期间重复触摸
- **THEN** 不产生重复导航、重复回调或重复摄入记录
