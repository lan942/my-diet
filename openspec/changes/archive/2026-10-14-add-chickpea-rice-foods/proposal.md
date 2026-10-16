## Why

白米饭是中日韩及东南亚用户最高频的日常主食，鹰嘴豆（Chickpeas）是欧美健康饮食与素食人群的常用豆类；当前内置数据集二者均缺失，用户每次都需手动建条目才能记录，且无法享受生活化份量快捷录入。借本次增补把两种食物以双语种子 + 份量预设的形式内置，新装与覆盖升级用户都能直接使用。

## What Changes

- 种子数据集新增 2 种食物（双语名称 + 双语备注 + per-100g 营养；白米饭含 GI）：
  - **白米饭 White Rice (Cooked)**：碳水分类，116 kcal / P2.6 / F0.3 / C25.9，gi=73（与主 spec 既有「高 GI 不标注」场景取值一致）
  - **鹰嘴豆 Chickpeas (Cooked)**：膳食纤维分类（与扁豆同位），164 kcal / P8.9 / F2.6 / C27.4，**不写 gi**（遵循 gi 仅碳水分类约定，低 GI 语义写入双语 notes）
- 两种食物均内置双语生活化份量预设：
  - 白米饭：1/2 碗（熟）≈75g、1 碗（熟）≈150g
  - 鹰嘴豆：1/2 杯（熟）≈80g、1 杯（熟）≈160g
- 种子食物升级补齐机制：非空食物库启动时，除现有 portions 回填外，按 canonical 中文名检测并**插入缺失的种子食物**（已存在同名条目则跳过，不覆盖用户自建/已编辑数据），保证覆盖安装用户也能拿到新增种子。
- 无数据库结构变更（portions 列已存在）、无 UI/i18n 变更（Quick Log 双模式与双语显示自动生效）、备份/恢复链路天然兼容。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `food-library`: 内置精选数据集新增白米饭、鹰嘴豆 2 个条目（数据集从 26 条增至 28 条）；新增「种子食物升级补齐」需求（缺失种子幂等插入）；生活化份量预设需求补充两种新食物的锚点示例。

## Impact

- `src/services/foodService.ts`：`SEED_FOODS` 增加 2 条；`ensureSeedFoods()` 非空库分支增加缺失种子插入逻辑（沿用现有 canonical 名匹配与分类定位）。
- `tests/`：新增/补充种子条目与升级补齐的单元测试。
- 数据库：无 schema 迁移；备份/恢复：food_item 普通行，自动随现有链路往返，无需改动。
- UI/i18n：零改动，Quick Log 检测到 portions 非空自动启用「份量」模式。
- 发布：版本号三处同步（app.json version/versionCode、android/app/build.gradle），构建 APK 并打 ZIP 交付。
