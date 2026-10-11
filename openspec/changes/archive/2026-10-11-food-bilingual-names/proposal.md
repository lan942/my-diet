## Why

食物名与备注目前按首启 locale 单语言入库，用户切换系统语言后 UI 全部翻译但食物数据不变（全麦面包/低 GI 等字眼保持旧语言）。直接落双层方案：food_item 存双语列（name_en/notes_en），显示层按当前 locale 动态选取，切语言即变。应用未上架无存量用户，无需历史数据迁移，仅幂等加列。

## What Changes

- food_item 新增 `name_en`、`notes_en` 可空列（幂等 ALTER 迁移）
- 种子写入双语言：name 存中文（canonical）、name_en 存英文、notes/notes_en 同理
- 新增纯函数 `foodDisplayName(item, locale)` / `foodDisplayNotes(item, locale)`：zh → 中文列，en → 英文列（空则回退 name/notes），自定义食物单名原样显示
- 展示位点接入：食物库列表/推荐卡/备注、QuickLogSheet、今日页摄入记录行；编辑表单仍预填存储名（编辑 canonical 数据）
- 备份/恢复链路兼容新列（旧备份缺省 null 合法）

## Capabilities

### Modified Capabilities

- `food-library`：内置精选食物数据集改为双语双列写入；新增「食物名与备注按当前语言动态显示」需求

## Impact

- types/db/foodService/dataService 小改；FoodLibraryScreen、QuickLogSheet、IntakeScreen 展示行换用显示函数
- vitest 补显示函数与种子双写断言；既有 fixture 补新字段
- 版本 1.7.1 / versionCode 23，构建交付 ZIP
