## 1. 数据层：highlight 列迁移与类型

- [x] 1.1 types.ts：FoodItem 增加 `highlight: number` 字段
- [x] 1.2 src/db/database.ts：DDL 中 food_item 增加 highlight INTEGER NOT NULL DEFAULT 0；ensureMigrations 用 PRAGMA table_info 判重后 ALTER TABLE 幂等加列
- [x] 1.3 foodService.ts：CatRow/ItemRow/mapItemRow、INSERT/UPDATE 语句补 highlight；createFoodItem 入参补 highlight（默认 0），UI 编辑不暴露该字段

## 2. 种子数据集重建

- [x] 2.1 foodService.ts：按 design D4 重建 SEED_FOODS（约 25 条四维度，zh/en 双名 + notes 亮点 + highlight 标记 ≥ 8 条，营养值按用户数据集，消除奇亚籽/燕麦/西兰花/菠菜重复行，gi 仅碳水保留）
- [x] 2.2 ensureSeedFoods 写入 highlight 与备注；验证 zh/en 双 locale 种子分支
- [x] 2.3 vitest：种子数据完整性断言（数量 ≈25、highlight ≥ 8、鸡胸肉 165/31/3.6/0、野生三文鱼 206/22/12/0、奇亚籽 486/16.5/30.7/42.1、无重复名+分类组合）

## 3. 服务层：标签派生与搜索

- [x] 3.1 foodService.ts 新增纯函数 `foodTags(item, categoryId?)`：按 spec 规则派生（High Protein/Healthy Fats/Complex Carb/High Fiber/Antioxidant/Zero Carb/Low GI），最多 2 个，返回有序标签数组；vitest 覆盖鸡胸肉/燕麦/自定义食物/边界值（19.9g 蛋白不打标）
- [x] 3.2 新增 `filterFoods(items, query, categoryId)` 纯函数：名称大小写不敏感包含匹配 + 分类叠加；vitest 覆盖中英文关键字、无结果、叠加场景

## 4. i18n

- [x] 4.1 en.ts/zh.ts 新增 food-library key：搜索占位、SUPERFOOD HIGHLIGHTS 标题、ALL FOODS 标题、100g serving 标注、语义标签（High Protein/Healthy Fats/Complex Carb/High Fiber/Antioxidant/Zero Carb/Low GI）、Quick Log 相关（份量、餐次、Add to Today、成功提示）、Create Custom Food；en 分类 Pill 文案改为营养属性命名（High Protein/Healthy Fats/Complex Carbs/High Fiber/Antioxidants）
- [x] 4.2 核对无硬编码文案残留，全部 Text 带 maxFontSizeMultiplier={1.4}

## 5. QuickLogSheet 组件

- [x] 5.1 新建 src/components/QuickLogSheet.tsx：复用 EditSheet 壳（Modal + grabber + PanResponder 下拉关闭 + 遮罩点击关闭 + Light Haptics），内容：食物名 + 100g 营养行、预设克数片 50/100/150/200g、Slider（10–500 step 10，拖动 Light Haptics）、餐次 SegmentedControl（默认按时段推断 <10:30 早/<14:30 午/<21:00 晚/其余加餐）、实时营养预览（语义色 P/F/C）
- [x] 5.2 提交逻辑：Add to Today → intakeService.createIntake（date=today）→ AppContext.refresh()（原地更新，严禁 setLoading）→ 关闭抽屉 + 成功轻提示；grams ≤ 0/非数字走 BizError ERR.INVALID_GRAMS 提示
- [x] 5.3 vitest：时段默认餐次推断、per-100g × grams/100 换算、非法 grams 拒绝

## 6. FoodLibraryScreen 重构

- [x] 6.1 信息架构五段式：顶部搜索 TextField（icon search）→ 横向分类 Pills（All + 5 分类，沿用 chips 样式）→ SUPERFOOD HIGHLIGHTS 横滑区（highlight=1，卡片宽 ~200：名称 + notes 亮点 + kcal，语义色边条，点击拉起该食物 Quick Log）→ ALL FOODS 卡片列表 → 底部固定「+ Create Custom Food」按钮
- [x] 6.2 食物卡片：Soft Card（圆角 16 + 微投影）+ 左侧 4px 分类语义色条 + 名称/100g 营养行（P/F/C 着色）+ foodTags 标签胶囊 + GI 标注；右侧 [+] accent 圆底按钮（Quick Log）与编辑/删除次级图标（hitSlop 区分）
- [x] 6.3 既有内联增删改表单迁入 EditSheet（Add/Edit Food 双态）；删除沿用删除校验错误提示（被引用不可删）
- [x] 6.4 列表过滤管线 useMemo：filterFoods(query, selectedCat)；高亮区为空时整区隐藏；空态文案
- [x] 6.5 布局适配：容器 maxWidth 640 居中；全页无系统 Alert；风格走 theme.ts tokens

## 7. 校验与回归

- [x] 7.1 npx tsc --noEmit + expo lint + vitest 全量通过（含既有 64 测试）
- [x] 7.2 openspec validate 校验 change；核对 specs delta 与实现一致
- [x] 7.3 版本号手动同步：app.json versionName/versionCode 与 android/app/build.gradle（1.7.0 / 22）
- [x] 7.4 gradlew assembleRelease 构建（Windows 用 .\gradlew.bat；失败后勿信增量，clean 重跑），生成 my-diet-v1.7.0.zip 交付微信传输
