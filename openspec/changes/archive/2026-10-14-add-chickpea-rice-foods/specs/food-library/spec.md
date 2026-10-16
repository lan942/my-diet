## MODIFIED Requirements

### Requirement: 标注低 GI 碳水
系统 SHALL 对食物条目支持 gi 字段（整数或空）。碳水分类中 GI ≤ 55 的食物 SHALL 在 UI 上标注「低 GI」。

#### Scenario: 低 GI 碳水展示标注
- **WHEN** 碳水分类中燕麦 gi=55
- **THEN** 食物库页该条目展示「低 GI」标签

#### Scenario: 高 GI 不标注
- **WHEN** 种子白米饭（碳水分类）gi=73
- **THEN** 食物库该条目不展示「低 GI」标签

### Requirement: 内置精选食物数据集
系统 SHALL 在种子写入时内置约 28 种高营养密度食物，覆盖高优质蛋白（鸡胸肉、野生三文鱼、蛋白、0% 脂肪希腊酸奶、老豆腐）、优质脂肪（牛油果、特级初榨橄榄油、大杏仁、奇亚籽）、优质复合碳水（红薯、燕麦片、藜麦、白米饭）、纤维与抗氧化（蓝莓、90% 黑巧、西兰花、菠菜、扁豆、鹰嘴豆）等维度；每条同时写入双语名称与备注（name=中文名、name_en=英文名、notes=中文亮点、notes_en=英文亮点），含 per-100g 热量与三大营养素。

#### Scenario: 新装设备种子双写
- **WHEN** 应用首次启动且食物库为空
- **THEN** 写入约 28 条食物，每条 name 为中文名且 name_en 为英文名，notes/notes_en 均有值

#### Scenario: 数据集营养值正确
- **WHEN** 校验种子数据
- **THEN** 鸡胸肉 165 kcal / P31 / F3.6 / C0，野生三文鱼 206 kcal / P22 / F12 / C0，奇亚籽 486 kcal / P16.5 / F30.7 / C42.1

#### Scenario: 白米饭种子营养值
- **WHEN** 校验种子白米饭（White Rice (Cooked)，碳水分类）
- **THEN** 其值为 116 kcal / P2.6 / F0.3 / C25.9，gi=73，熟重口径

#### Scenario: 鹰嘴豆种子营养值
- **WHEN** 校验种子鹰嘴豆（Chickpeas (Cooked)，膳食纤维分类）
- **THEN** 其值为 164 kcal / P8.9 / F2.6 / C27.4，无 gi 字段（低 GI 语义仅在 notes 体现），熟重口径

### Requirement: 生活化份量预设数据
系统 SHALL 为 food_item 提供 portions 可空列（JSON 数组，每项含 zh/en 双语标签与 grams 克数锚点），幂等迁移加列；种子为常见食物写入国际通用手掌/拳头/杯勺估算预设（如鸡胸肉 1 掌心 ≈100g、牛油果半个 ≈100g、杏仁 1 把 ≈30g、橄榄油 1 汤匙 ≈14g、燕麦 1/2 杯干 ≈40g、蓝莓 1 把 ≈75g、黑巧 1 小块 ≈10g、白米饭 1/2 碗（熟）≈75g 与 1 碗（熟）≈150g、鹰嘴豆 1/2 杯（熟）≈80g 与 1 杯（熟）≈160g 等）；自定义食物 portions 为 null。备份/恢复链路兼容该列（旧备份缺省 null 合法）。

#### Scenario: 种子预设写入
- **WHEN** 新装设备首次种子写入
- **THEN** 鸡胸肉、野生三文鱼、牛油果、大杏仁、橄榄油、红薯、燕麦片、藜麦、蓝莓、90% 黑巧、白米饭、鹰嘴豆等常见食物的 portions 均为合法 JSON 数组且每项 grams > 0

#### Scenario: 白米饭与鹰嘴豆份量锚点
- **WHEN** 校验新种子的 portions
- **THEN** 白米饭为 1/2 碗（熟）75g、1 碗（熟）150g；鹰嘴豆为 1/2 杯（熟）80g、1 杯（熟）160g，每项均含 zh/en 双语标签

#### Scenario: 自定义食物无预设
- **WHEN** 用户创建自定义食物
- **THEN** 其 portions 为 null，Quick Log 仅显示克数模式

#### Scenario: 备份往返
- **WHEN** 导出含 portions 的备份并导入恢复
- **THEN** portions 预设完整保留

#### Scenario: 旧库升级回填
- **WHEN** 旧版本（无 portions 种子）升级到新版本且食物库已有数据
- **THEN** 启动时按种子中文名匹配回填 portions（仅填 NULL 行，用户自建与已编辑数据不被覆盖），Quick Log 立即可用份量模式

## ADDED Requirements

### Requirement: 种子食物升级补齐
系统 SHALL 在应用启动且食物库非空（覆盖安装场景）时，按种子 canonical 中文名检测缺失的种子食物并幂等插入：缺失条目以完整种子数据（双语名称/备注、per-100g 营养、gi、portions JSON）写入其种子分类；已存在同名条目时 SHALL NOT 插入也不覆盖（用户自建与已编辑数据优先）。多次启动 SHALL NOT 产生重复行。

#### Scenario: 升级后获得新增种子
- **WHEN** 旧版本食物库（不含白米饭、鹰嘴豆）覆盖升级到新版本后启动
- **THEN** 白米饭插入碳水分类（gi=73、含碗装份量预设），鹰嘴豆插入膳食纤维分类（含杯装份量预设），Quick Log 对二者默认启用份量模式

#### Scenario: 同名用户条目优先
- **WHEN** 食物库中已存在用户自建的名为「白米饭」的条目时启动
- **THEN** 系统保留该用户条目原样（营养值与 portions 不被改动），不再插入官方种子

#### Scenario: 重复启动幂等
- **WHEN** 种子补齐后再次启动应用
- **THEN** 无任何新插入，食物库不出现重复种子行

#### Scenario: 分类缺失时跳过不中断
- **WHEN** 某缺失种子对应的分类在库中不存在
- **THEN** 系统跳过该条插入并继续补齐其余种子，不抛出错误
