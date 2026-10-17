## Purpose
提供优质食物分类与食物条目管理，内置精选高营养密度食物数据集（高优质蛋白/优质脂肪/复合碳水/纤维与抗氧化四大维度），支持分类 Pills 筛选、名称搜索、语义化营养标签、快捷记录、双语名称显示与增删改。
## Requirements
### Requirement: 内置优质食物分类
系统 SHALL 预置以下食物分类（首次启动时种子写入）：碳水、蛋白质、脂肪、抗氧化蔬菜、膳食纤维。每个分类有 name 与 sort_order，支持排序展示。

#### Scenario: 首次启动预置分类
- **WHEN** 应用首次启动且数据库为空
- **THEN** 系统写入 5 个分类，食物库页按 sort_order 展示

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

### Requirement: 按分类筛选食物
系统 SHALL 允许用户在食物库页通过顶部水平滑动的分类 Pills 筛选食物列表：All（全部）+ 5 个种子分类；英文 locale 下分类 Pill 按营养属性命名（High Protein / Healthy Fats / Complex Carbs / High Fiber / Antioxidants），中文 locale 沿用现有分类名。选中分类后列表仅展示该分类下的食物条目。

#### Scenario: 筛选某分类
- **WHEN** 用户选择「抗氧化蔬菜」（en: Antioxidants）分类 Pill
- **THEN** 列表仅展示该分类下的食物条目

#### Scenario: 切回全部
- **WHEN** 用户选择 All Pill
- **THEN** 列表展示全部食物条目

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

### Requirement: 食物库快捷记录入口
系统 SHALL 在每张食物卡片右侧提供 [+] 快捷记录按钮，点击拉起轻量底部抽屉（Quick Log Sheet，复用 ActionSheet 视觉语言），内含该食物 100g 营养摘要、份量选择与餐次选择，一键写入当日摄入。抽屉交互 SHALL 满足 sheet-interactions 能力的关闭锁定与防重复触发要求。

#### Scenario: 点击加号拉起抽屉
- **WHEN** 用户点击鸡胸肉卡片的 [+] 按钮
- **THEN** 拉起 Quick Log 底部抽屉，展示鸡胸肉营养信息、份量选择与餐次选择

#### Scenario: 动画窗口连点不重复拉起或重复提交
- **WHEN** 用户在抽屉关闭动画期间重复触摸
- **THEN** 不产生重复导航、重复回调或重复摄入记录

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

### Requirement: 旧库数据兼容
系统 SHALL 对已存在的旧数据库执行幂等迁移：food_item 表新增 name_en 与 notes_en 可空列（PRAGMA table_info 判重后 ALTER TABLE），不改动用户已有食物数据。

#### Scenario: 旧库升级
- **WHEN** 旧版本数据库升级到新版本
- **THEN** food_item 表新增 name_en/notes_en 列且已有行为空，用户已有食物与摄入记录不受影响

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

### Requirement: 编辑与删除入口
系统 SHALL 在食物卡片上提供编辑与删除入口（行内图标），沿用既有编辑表单与删除校验（被 intake_log 引用的食物不可删除）；[+] 快捷记录按钮与编辑/删除入口视觉区分，避免误触。

#### Scenario: 编辑既有食物
- **WHEN** 用户点击食物卡片的编辑入口并修改营养值保存
- **THEN** 系统保存并刷新卡片展示

#### Scenario: 删除被引用食物仍被拒绝
- **WHEN** 用户删除一个已被摄入记录引用的食物
- **THEN** 系统拒绝删除并提示「该食物已被摄入记录引用，无法删除」

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

### Requirement: 中国家常食物数据集
系统 SHALL 在内置种子数据集中追加 19 条中国人常见家常食物，覆盖中国家庭日常饮食的高频条目：碳水主食（馒头、面条（煮熟）、白粥（大米）、鲜玉米、猪肉白菜水饺（熟））、家常蛋白（猪里脊、五花肉、鸡腿（带皮）、瘦牛肉、无糖豆浆）、家常油脂（花生（炒）、花生油）、家常蔬菜（黄瓜、大白菜、茄子、青椒）与家常水果（橙子、西瓜、桃子）。每条 SHALL 完整复用既有种子数据结构：name=中文 canonical 名、name_en=英文名、notes/notes_en 双语备注、per-100g 热量与三大营养素、按需 gi（0–100）、生活化份量 portions（中式锚点）。营养值 SHALL 采用《中国食物成分表》优先口径（USDA 兜底），熟重/可食部口径 SHALL 在名称或备注中标注。家常混合菜（烹饪用油差异大的炒菜类）SHALL NOT 纳入本数据集。

#### Scenario: 新装设备包含家常食物
- **WHEN** 应用首次启动且食物库为空
- **THEN** 种子写入 52 条食物（33 条既有精选集 + 19 条中国家常），家常条目分布在其种子分类下且双语名称与备注均有值

#### Scenario: 家常主食营养值口径
- **WHEN** 校验种子馒头与白粥
- **THEN** 馒头为 223 kcal / P7.0 / C47.0 / F1.1（gi=88，高 GI 不标注低 GI 标签），白粥（大米）为 46 kcal / P1.1 / C9.9 / F0.3（gi=69，熟重口径，备注注明）

#### Scenario: 家常蛋白营养值口径
- **WHEN** 校验种子猪里脊与五花肉
- **THEN** 猪里脊（生）为 155 kcal / P20.2 / C0.7 / F7.9，五花肉（生）为 518 kcal / P7.7 / C0.9 / F53.0（高脂食物如实录入，notes 提示适量）

#### Scenario: 中式份量锚点
- **WHEN** 校验新增家常种子的 portions
- **THEN** 馒头为 1 个（中等）100g、半个 50g；白粥为 1 碗 250g；猪肉白菜水饺（熟）为 1 个 20g、10 个 200g；每项均含 zh/en 双语标签且 grams > 0

#### Scenario: 升级设备自动获得家常种子
- **WHEN** 旧版本（无家常种子）覆盖安装升级后启动
- **THEN** 按 canonical 中文名幂等补齐缺失的家常条目，Quick Log 对含 portions 的条目默认启用份量模式；用户自建同名条目不被覆盖或重复插入

### Requirement: Everyday foods are available in the built-in library
The built-in food library SHALL include a useful selection of familiar everyday foods in addition to the existing curated dataset. The selection SHALL cover common fruit, dairy, eggs, staple grains, and commonly logged proteins, including familiar examples such as egg, banana, apple, milk, and plain yogurt when not already represented. Each seeded item SHALL include Chinese and English names, plausible per-100g energy and macronutrients, and a preparation basis (such as raw, cooked, or plain) in its name or notes where relevant. Suitable household portion presets SHALL be provided for common countable foods where practical. Seeded content SHALL describe nutrition information without medical claims.

#### Scenario: New installation includes everyday options
- **WHEN** a new installation initializes the food library
- **THEN** the library contains the existing curated foods and the missing everyday examples with bilingual names and nutrition information

#### Scenario: Preparation basis is clear
- **WHEN** a seeded food's nutrition depends on preparation state
- **THEN** its displayed name or notes identify the relevant raw, cooked, or plain basis

### Requirement: Everyday food seeds upgrade existing libraries safely
The application SHALL add missing everyday seed foods to a non-empty existing food library using the established idempotent seed-upgrade path. Matching SHALL use the canonical Chinese seed name. Existing rows SHALL NOT be overwritten or duplicated, and absence of a seed category SHALL NOT prevent other available seeds from being added.

#### Scenario: Upgrade fills missing foods
- **WHEN** an existing installation starts with some everyday seeds absent
- **THEN** each absent seed with an available category is inserted with its complete bilingual data and suitable portions

#### Scenario: Existing same-name item is preserved
- **WHEN** a same-name user food already exists
- **THEN** its nutrition, notes, and portions remain unchanged and no duplicate is inserted

#### Scenario: Repeated startup is idempotent
- **WHEN** startup seed upgrade runs more than once
- **THEN** no duplicate everyday food rows are created

