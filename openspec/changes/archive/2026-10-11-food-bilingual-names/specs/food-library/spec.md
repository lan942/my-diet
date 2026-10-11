## MODIFIED Requirements

### Requirement: 内置精选食物数据集
系统 SHALL 在种子写入时内置约 25 种欧美市场高认可度的高营养密度食物，覆盖高优质蛋白（鸡胸肉、野生三文鱼、蛋白、0% 脂肪希腊酸奶、老豆腐）、优质脂肪（牛油果、特级初榨橄榄油、大杏仁、奇亚籽）、优质复合碳水（红薯、燕麦片、藜麦）、纤维与抗氧化（蓝莓、90% 黑巧、西兰花、菠菜）等维度；每条同时写入双语名称与备注（name=中文名、name_en=英文名、notes=中文亮点、notes_en=英文亮点），含 per-100g 热量与三大营养素，并为其中 ≥ 8 种高营养密度代表标记 highlight=1。

#### Scenario: 新装设备种子双写
- **WHEN** 应用首次启动且食物库为空
- **THEN** 写入约 25 条食物，每条 name 为中文名且 name_en 为英文名，notes/notes_en 均有值；高亮条目 ≥ 8

#### Scenario: 数据集营养值正确
- **WHEN** 校验种子数据
- **THEN** 鸡胸肉 165 kcal / P31 / F3.6 / C0，野生三文鱼 206 kcal / P22 / F12 / C0，奇亚籽 486 kcal / P16.5 / F30.7 / C42.1

## ADDED Requirements

### Requirement: 食物名与备注动态显示
系统 SHALL 按当前 locale 动态显示食物名称与备注：zh 显示 name/notes，en 显示 name_en/notes_en（缺失时回退 name/notes）；自定义食物（name_en 为空）原样显示存储名。切换系统语言后食物名与备注随 UI 文案同步变化。

#### Scenario: 英文 locale 显示英文名
- **WHEN** 当前 locale 为 en 且食物 name_en 非空
- **THEN** 食物库列表、推荐卡、Quick Log 抽屉、今日页摄入记录均显示 name_en（如 Whole Wheat Bread）

#### Scenario: 英文 locale 显示英文备注
- **WHEN** 当前 locale 为 en 且食物 notes_en 非空
- **THEN** 卡片营养亮点显示 notes_en（如 Low GI whole-grain staple）

#### Scenario: 自定义食物回退
- **WHEN** 用户自定义食物（name_en 为空）且当前 locale 为 en
- **THEN** 显示存储的 name 原文

#### Scenario: 编辑表单预填存储名
- **WHEN** 用户编辑任一食物
- **THEN** 表单预填 name/notes 存储值（canonical 数据），而非按 locale 派生的显示值
