## MODIFIED Requirements

### Requirement: 按分类筛选食物
系统 SHALL 允许用户在食物库页通过顶部水平滑动的分类 Pills 筛选食物列表：All（全部）+ 5 个种子分类；英文 locale 下分类 Pill 按营养属性命名（High Protein / Healthy Fats / Complex Carbs / High Fiber / Antioxidants），中文 locale 沿用现有分类名。选中分类后列表仅展示该分类下的食物条目。

#### Scenario: 筛选某分类
- **WHEN** 用户选择「抗氧化蔬菜」（en: Antioxidants）分类 Pill
- **THEN** 列表仅展示该分类下的食物条目

#### Scenario: 切回全部
- **WHEN** 用户选择 All Pill
- **THEN** 列表展示全部食物条目

## ADDED Requirements

### Requirement: 食物名称搜索
系统 SHALL 在食物库页顶部提供搜索框，按名称对食物进行本地实时过滤（大小写不敏感，中英文均可），搜索结果与当前分类筛选叠加生效。

#### Scenario: 英文关键字命中
- **WHEN** 用户在搜索框输入 "chick"
- **THEN** 列表实时仅展示名称包含 "chick"（不区分大小写）的食物（如 Chicken Breast）

#### Scenario: 中文关键字命中
- **WHEN** 用户在搜索框输入「鸡」
- **THEN** 列表实时仅展示名称包含「鸡」的食物（如 鸡胸肉）

#### Scenario: 搜索与分类叠加
- **WHEN** 用户选中「蛋白质」分类并搜索 "cod"
- **THEN** 列表仅展示蛋白质分类下名称包含 "cod" 的食物

#### Scenario: 无结果空态
- **WHEN** 搜索关键字无任何命中
- **THEN** 列表展示空态提示

### Requirement: 语义化营养标签
系统 SHALL 根据食物营养值与所属分类为每张食物卡片派生语义化胶囊标签：protein ≥ 20g/100g 标「High Protein」；fat ≥ 10g/100g 标「Healthy Fats」；属于碳水分类且 carb ≥ 20g/100g 标「Complex Carb」；属于膳食纤维分类标「High Fiber」；属于抗氧化蔬菜分类标「Antioxidant」；carb = 0 标「Zero Carb」；GI ≤ 55 沿用「Low GI」。标签配色沿用宏量营养素语义色 tokens（蛋白 #6366F1 / 脂肪 #F59E0B / 碳水 #10B981 / 低 GI 绿），同一卡片最多展示 2 个标签。

#### Scenario: 高蛋白食物标签
- **WHEN** 鸡胸肉 protein_per_100g=31、carb=0
- **THEN** 卡片展示「High Protein」「Zero Carb」标签

#### Scenario: 低 GI 标签沿用
- **WHEN** 燕麦片 gi=55
- **THEN** 卡片展示「Low GI」标签

#### Scenario: 自定义食物参与派生
- **WHEN** 用户自定义食物 protein_per_100g=25
- **THEN** 该卡片同样展示「High Protein」标签

### Requirement: SUPERFOOD 推荐位
系统 SHALL 在食物列表顶部提供 SUPERFOOD HIGHLIGHTS 横滑推荐区，展示内置精选高营养密度食物（highlight=1）卡片：食物名 + 一句话营养亮点（notes）+ 100g 热量；点击推荐卡直接打开该食物的 Quick Log 抽屉。

#### Scenario: 推荐区展示精选食物
- **WHEN** 食物库页加载且存在 highlight=1 的食物
- **THEN** 顶部横滑区展示这些食物卡片及营养亮点

#### Scenario: 点击推荐卡快捷记录
- **WHEN** 用户点击蓝莓推荐卡
- **THEN** 拉起蓝莓的 Quick Log 抽屉

#### Scenario: 无高亮食物时隐藏
- **WHEN** 库中不存在 highlight=1 的食物
- **THEN** 推荐区整体隐藏，不展示空占位

### Requirement: 食物库快捷记录入口
系统 SHALL 在每张食物卡片右侧提供 [+] 快捷记录按钮，点击拉起轻量底部抽屉（Quick Log Sheet，复用 ActionSheet 视觉语言），内含该食物 100g 营养摘要、份量选择与餐次选择，一键写入当日摄入。

#### Scenario: 点击加号拉起抽屉
- **WHEN** 用户点击鸡胸肉卡片的 [+] 按钮
- **THEN** 拉起 Quick Log 底部抽屉，展示鸡胸肉营养信息、份量选择与餐次选择

### Requirement: 内置精选食物数据集
系统 SHALL 在种子写入时内置约 25 种欧美市场高认可度的高营养密度食物，覆盖高优质蛋白（鸡胸肉、野生三文鱼、蛋白、0% 脂肪希腊酸奶、老豆腐）、优质脂肪（牛油果、特级初榨橄榄油、大杏仁、奇亚籽）、优质复合碳水（红薯、燕麦片、藜麦）、纤维与抗氧化（蓝莓、90% 黑巧、西兰花、菠菜）等维度；每条含 per-100g 热量与三大营养素、中英双语名称与一句话营养亮点备注，并为其中 ≥ 8 种高营养密度代表标记 highlight=1。

#### Scenario: 新装英文设备种子
- **WHEN** 应用首次启动且食物库为空且 locale 为 en
- **THEN** 写入约 25 条英文名食物，其中 ≥ 8 条 highlight=1，营养亮点为英文备注

#### Scenario: 数据集营养值正确
- **WHEN** 校验种子数据
- **THEN** 鸡胸肉 165 kcal / P31 / F3.6 / C0，野生三文鱼 206 kcal / P22 / F12 / C0，奇亚籽 486 kcal / P16.5 / F30.7 / C42.1

### Requirement: 旧库数据兼容
系统 SHALL 对已存在的旧数据库执行幂等迁移：food_item 表新增 highlight 列（INTEGER，默认 0），不改动用户已有食物数据；highlight=0 的食物不进入推荐位。

#### Scenario: 旧库升级
- **WHEN** 旧版本数据库升级到新版本
- **THEN** food_item 表新增 highlight 列且已有行默认 0，用户已有食物与摄入记录不受影响

### Requirement: 编辑与删除入口
系统 SHALL 在食物卡片上提供编辑与删除入口（行内图标），沿用既有编辑表单与删除校验（被 intake_log 引用的食物不可删除）；[+] 快捷记录按钮与编辑/删除入口视觉区分，避免误触。

#### Scenario: 编辑既有食物
- **WHEN** 用户点击食物卡片的编辑入口并修改营养值保存
- **THEN** 系统保存并刷新卡片展示

#### Scenario: 删除被引用食物仍被拒绝
- **WHEN** 用户删除一个已被摄入记录引用的食物
- **THEN** 系统拒绝删除并提示「该食物已被摄入记录引用，无法删除」
