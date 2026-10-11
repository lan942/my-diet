## Why

食物库页信息密度过高，用户要求去掉「Superfood Highlights」推荐位。该区依赖的 highlight 机制（列/种子标记/筛选逻辑）随之整体清理，保持代码干净；应用未上架无存量用户，无迁移负担。

## What Changes

- 移除 FoodLibraryScreen 的 SUPERFOOD HIGHLIGHTS 横滑推荐区及其样式、相关 i18n key
- 移除 highlight 全链路：types、schema DDL、迁移、种子标记、createFoodItem、备份解析、restoreAllData、测试断言
- 主 spec：删除「SUPERFOOD 推荐位」需求；「内置精选食物数据集」去掉 highlight 标记描述；「旧库数据兼容」改写为 name_en/notes_en 幂等加列

## Capabilities

### Modified Capabilities

- `food-library`：删除推荐位需求，数据集与迁移需求随之收敛

## Impact

- 数据集 26 条全保留（仅去 highlight 标记）；其余功能不变
- 版本 1.7.2 / versionCode 24，构建交付 ZIP
