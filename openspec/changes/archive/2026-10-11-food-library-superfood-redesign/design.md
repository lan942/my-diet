## Context

当前 FoodLibraryScreen 是「分类 chips + Card 内 Row 列表 + 内联表单」的管理型页面；种子库 26 条食物（部分名称在脂肪/膳食纤维分类重复）、无搜索、无快捷记录、无推荐位。食物记录必须切回「今日」页完成。项目已有统一的底部抽屉视觉语言（EditSheet 内容抽屉 / ActionSheet 操作抽屉，grabber + 手势下拉关闭 + Light Haptics），本变更必须沿用，禁止系统 Alert。UI 遵循 2026-10-11 固化的 Modern & Premium 方向：Soft Cards、宏量营养素语义色（#FF6B4A / #6366F1 / #F59E0B / #10B981）、maxFontSizeMultiplier、maxWidth 居中。

## Goals / Non-Goals

**Goals:**

- Food Library 五段式信息架构：搜索框 → 分类 Pills → SUPERFOOD HIGHLIGHTS → ALL FOODS 卡片列表 → 底部 Create Custom Food
- 一键记饮食：卡片 [+] → Quick Log 抽屉（份量 + 餐次）→ Add to Today 直写 intake_log，全程不跳页
- 微型百科感：语义化营养标签 + 营养亮点备注 + 精选推荐位
- 种子数据集升级为欧美高认可度高营养密度食物（约 25 条，≥8 条 highlight）

**Non-Goals:**

- 不做膳食纤维独立营养列（fiber 不入库，标签按分类派生）
- 不做食物详情页（亮点在卡片与推荐卡直接可见）
- 不做云端食物数据库 / 条码扫描（保持 100% 离线）
- 不做份量"Serving"单位换算体系（份量统一为克，预设快捷片即够用）
- 不改「今日」页既有记录流程

## Decisions

### D1：分类 Pills = 既有 5 分类重命名展示，不新增第四套实体

用户设计稿的 Pills（High Protein / Healthy Fats / Complex Carbs / High Fiber / Antioxidants）与现有 5 个种子分类一一对应。**不做**独立的营养属性实体，直接复用 `food_category` + 现有 `categoryDisplayKey` 映射，仅将 en 文案改为营养属性命名（`cat.protein` → "High Protein" 等）。理由：零 schema 变更、旧库天然兼容、i18n 已有映射管道。

### D2：营养标签纯派生，不入库

新增纯函数 `foodTags(item): FoodTag[]`（foodService 导出，vitest 可测），按 spec 规则从 macros + category 派生，最多返回 2 个标签（优先级：High Protein > Healthy Fats > Complex Carb > High Fiber > Antioxidant > Zero Carb > Low GI）。**不**新增 tags 列：派生规则确定性足够，入库反而带来自定义食物维护负担与旧库迁移成本。备选（tags 列 + 编辑器多选）因过度设计被否。

### D3：highlight 落列而非派生

`food_item` 新增 `highlight INTEGER NOT NULL DEFAULT 0`，沿用 `PRAGMA table_info` 判重 + `ALTER TABLE` 幂等迁移模式（同 step_log.source）。推荐位 = `highlight=1` 的食物横滑卡片。理由：SUPERFOOD 推荐 = 人工策展属性，营养密度公式（如每 kcal 蛋白质）无法表达「90% 黑巧因黄烷醇入选」这类叙事；列方案对旧库零破坏（默认 0 → 无推荐时整区隐藏）。备选（notes 关键字匹配）脆弱且对 locale 敏感，否。

### D4：种子数据集重建（SEED_FOODS 替换）

以用户数据集为蓝本重建 `SEED_FOODS`：约 25 条、四维度（高优质蛋白 / 优质脂肪 / 优质复合碳水 / 纤维与抗氧化），每条 zh/en 双名 + notes_zh/notes_en 营养亮点 + highlight 标记。营养值以用户表格为准（如野生三文鱼 206/22/12/0、奇亚籽 486/16.5/30.7/42.1、0% 希腊酸奶 59/10/0.4/3.6）。**旧库用户不回填种子**（保持现有 ensureSeedFoods 仅空库写入的语义），旧库经 highlight 列幂等迁移（默认 0）无感兼容，推荐位为空时整区隐藏；duplication（奇亚籽/燕麦/西兰花/菠菜双分类）按新数据集维度归位，只保留单分类归属，消除重复行。` gi` 仅对碳水条目保留（燕麦 55、藜麦 53 等）。

### D5：QuickLogSheet 独立组件，复用 EditSheet 壳

ActionSheet 是「选项/确认」语义，塞滑杆不合适。新建 `src/components/QuickLogSheet.tsx`：复制 EditSheet 的 Modal + grabber + PanResponder 下拉关闭 + Light Haptics 壳，内容为——食物名 + 100g 营养行、预设克数片（50/100/150/200）+ 份量刻度尺、餐次 SegmentedControl（默认按时段推断：<10:30 早 / <14:30 午 / <21:00 晚 / 其余加餐）、实时营养预览（per-100g × grams/100，语义色）、CTA「Add to Today」（accent Button）。提交复用 `intakeService.createIntake` + `AppContext.refresh()`（原地更新，严禁 setLoading）。

> 实施修订：份量选择未用 RN 原生 Slider（项目无 @react-native-community/slider 依赖），改用既有 `RulerPicker`（min 10 / max 500 / step 10 + 逐格 selectionAsync 触觉），与「数值录入优先刻度尺 + 触觉」的既有设计语言一致，且避免引入新原生依赖。抽屉内容组件按 `food.id` keyed 挂载，用懒初始化 state 重置份量/餐次（规避 expo lint 的 effect setState 规则）。

### D6：搜索在内存过滤，不上 SQL

`foodItems` 已全量在 Context（<100 条量级），`useMemo` 中 `name.toLowerCase().includes(q)` 即可，与分类过滤叠加。不上 SQLite LIKE、不加 debounce（本地数据无延迟感）。

### D7：FoodLibraryScreen 布局与卡片

- 搜索框：顶部 TextField（icon search，圆角胶囊）；Pills 沿用现有 chips 样式改横向 ScrollView
- SUPERFOOD HIGHLIGHTS：横向 ScrollView，卡片宽 ~200，语义色渐变边条 + 食物 emoji/图标 + 名称 + notes 亮点 + kcal
- 食物卡片：Soft Card（#FFFFFF、圆角 16、shadow 0 4 12 rgba(0,0,0,0.04)），左侧 4px 分类语义色条（蛋白 #6366F1 / 脂肪 #F59E0B / 碳水 #10B981 / 纤维&抗氧化 #FF6B4A），中间名称 + 100g 营养行（P/F/C 着色）+ 标签胶囊，右侧 [+]（accent 圆底）+ 编辑/删除小图标（次级灰，hitSlop 8）
- 表单：既有内联表单迁入 EditSheet（标题 Add/Edit Food），底部固定「+ Create Custom Food」按钮触发
- 全部文案走 t() 新增 `food.*` key；Text 全部 `maxFontSizeMultiplier={1.4}`；容器 `maxWidth: 640`

### D8：类型与层间流

`types.ts` FoodItem 增 `highlight: number`；`foodService` 的 create/update 维持 highlight 由种子管理（用户编辑不暴露 highlight 开关，Non-Goal）。`ItemRow`/`mapItemRow`/INSERT/UPDATE 同步补列；`ensureSeedFoods` 写 highlight。

## Risks / Trade-offs

- [种子替换对老用户不可见] → 明确 Non-Goal 不回填；如需新数据集可在设置页后续提供「恢复默认食物库」（另行提案）
- [Slider 在低版本 Android 与超大字体下的可达性] → 预设克数片覆盖主路径，Slider 仅增强；文字 maxFontSizeMultiplier 1.4
- [推荐区横向卡 + 列表同屏嵌套滚动] → 外层垂直 ScrollView + 内层横向 ScrollView 是 RN 成熟组合；横向卡固定高度避免跳动
- [highlight 列迁移在 restoreAllData/备份链路] → BACKUP_VERSION 不升级：highlight 属派生展示数据，备份导出/导入按既有列集兼容处理（导入旧备份 highlight=0 合法）
- [en 文案改名影响旧库 zh 名映射] → categoryDisplayKey 按中文名映射不动；新装 en 库直接英文名，Pills 展示 t(cat.*)

## Migration Plan

1. types/foodService/database 增列与种子重建（幂等迁移，老库自动 ALTER）
2. QuickLogSheet + FoodLibraryScreen 重构 + i18n key
3. vitest：foodTags / highlight 种子完整性 / Quick Log 换算与时段默认餐次
4. tsc + lint + openspec validate → 构建交付 APK ZIP（versionName/Code 手动同步 build.gradle）

回滚：单版本功能变更，无破坏性数据操作；highlight 列留存无害。

## Open Questions

（无——份量体系、推荐位策展方式、数据集范围均已在 D2–D4 定稿）
