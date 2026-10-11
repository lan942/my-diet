## Why

当前食物库页只是「分类筛选 + 平铺列表 + 表单增删改」的管理工具，缺少探索感与记录效率：用户无法快速判断哪些食物值得吃（无营养属性标签、无推荐位），想记录一项食物还要跳回「今日」页手动录入份量与餐次。作为面向欧美市场的纯离线极简卡路里应用，Food Library 应同时承担「微型营养百科」的教育价值与「一键记饮食」的效率价值，这也是 MacroFactor / Cronometer 类产品商店页的核心卖点之一。

## What Changes

- **页面信息架构重构**：FoodLibraryScreen 改为「搜索框 + 水平滑动分类 Pills + SUPERFOOD HIGHLIGHTS 推荐横滑区 + ALL FOODS 卡片列表 + 底部固定 Create Custom Food 入口」的五段式布局
- **营养属性筛选**：分类 Pills 扩展为按营养属性切片：All / High Protein / Healthy Fats / Complex Carbs / High Fiber / Antioxidants，与现有 5 个种子分类映射打通
- **语义化胶囊标签**：食物卡片展示 100g 标准份量热量与 P/F/C 三营养素 + 语义化标签（如 High Protein / Zero Carb / Complex Carb / High Fiber / Antioxidant / Low GI），沿用宏量营养素语义色
- **SUPERFOOD HIGHLIGHTS**：内置精选高营养密度食物（如牛油果、蓝莓等）以横滑卡片置顶展示，附一句话营养亮点
- **Quick Log 一键记录**：点击卡片 [+] 拉起轻量 Bottom Sheet（复用 ActionSheet 视觉语言），支持份量滑选（克数预设 + Serving 换算）与餐次选择，Add to Today 直写今日 intake_log，无需跳转
- **食物搜索**：按名称实时过滤（本地 SQLite LIKE / 内存过滤），支持中英文名
- **内置精选数据集扩充**：种子食物库扩充为约 25 种欧美市场高认可度的营养密度食物（野生三文鱼、蛋白、0% 希腊酸奶、硬豆腐、特级初榨橄榄油、90% 黑巧、藜麦等），含营养亮点备注与营养属性标记
- **食物详情备注可见**：卡片/详情展示关键营养与推荐理由（notes 字段），保留微型百科感
- **编辑/删除入口收敛**：卡片长按或行内图标进入编辑/删除（沿用现有表单逻辑），避免与 Quick Log 的 [+] 冲突

## Capabilities

### New Capabilities

（无——全部能力落在既有 food-library / daily-intake 规格的演进上）

### Modified Capabilities

- `food-library`：页面信息架构重构（搜索、营养属性筛选、推荐区、语义标签、Quick Log 入口、自定义食物入口），内置精选数据集扩充，新增营养属性标记字段
- `daily-intake`：新增从食物库 Quick Log 直写今日摄入的场景（份量滑选 + 餐次选择 + Add to Today），不改变既有今日页记录语义

## Impact

- **Screens**：`src/screens/FoodLibraryScreen.tsx` 重构（信息架构 + 样式），新增 Quick Log 抽屉态
- **Services**：`src/services/foodService.ts`（种子数据集扩充、营养属性派生逻辑 `foodTags()`、按名称搜索）；`src/services/intakeService.ts` 复用 `createIntake`
- **Components**：复用 `ActionSheet`/`EditSheet` 底部抽屉视觉语言；新增食物卡片与份量滑选组件（含 Light Haptics）
- **DB**：`food_item` 可能新增 tags/备注列或以派生逻辑实现（design 阶段定）；种子仅在空库时写入，旧库用户通过「恢复默认食物库」或保持现状兼容
- **i18n**：`src/i18n/{en,zh}.ts` 新增 food-library 相关 key；全部文案走 t()，无硬编码中文
- **Tests**：vitest 覆盖 foodTags 派生、搜索过滤、种子数据完整性、Quick Log 参数换算
- **约束**：100% 离线、无系统 Alert、遵循 theme.ts tokens 与 UI Design Direction（Soft Cards / 微投影 / 语义色）
