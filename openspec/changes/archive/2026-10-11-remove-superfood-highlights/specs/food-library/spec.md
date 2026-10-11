## MODIFIED Requirements

### Requirement: 内置精选食物数据集
系统 SHALL 在种子写入时内置约 25 种欧美市场高认可度的高营养密度食物，覆盖高优质蛋白（鸡胸肉、野生三文鱼、蛋白、0% 脂肪希腊酸奶、老豆腐）、优质脂肪（牛油果、特级初榨橄榄油、大杏仁、奇亚籽）、优质复合碳水（红薯、燕麦片、藜麦）、纤维与抗氧化（蓝莓、90% 黑巧、西兰花、菠菜）等维度；每条同时写入双语名称与备注（name=中文名、name_en=英文名、notes=中文亮点、notes_en=英文亮点），含 per-100g 热量与三大营养素。

#### Scenario: 新装设备种子双写
- **WHEN** 应用首次启动且食物库为空
- **THEN** 写入约 25 条食物，每条 name 为中文名且 name_en 为英文名，notes/notes_en 均有值

#### Scenario: 数据集营养值正确
- **WHEN** 校验种子数据
- **THEN** 鸡胸肉 165 kcal / P31 / F3.6 / C0，野生三文鱼 206 kcal / P22 / F12 / C0，奇亚籽 486 kcal / P16.5 / F30.7 / C42.1

### Requirement: 旧库数据兼容
系统 SHALL 对已存在的旧数据库执行幂等迁移：food_item 表新增 name_en 与 notes_en 可空列（PRAGMA table_info 判重后 ALTER TABLE），不改动用户已有食物数据。

#### Scenario: 旧库升级
- **WHEN** 旧版本数据库升级到新版本
- **THEN** food_item 表新增 name_en/notes_en 列且已有行为空，用户已有食物与摄入记录不受影响

## REMOVED Requirements

### Requirement: SUPERFOOD 推荐位
**Reason**: 食物库页信息密度过高，产品决策移除该横滑推荐区；highlight 机制（数据列/种子标记/筛选）一并清理。
**Migration**: 食物库列表与 Quick Log 入口保持不变；精选数据集本身保留，仅不再有推荐位展示。
