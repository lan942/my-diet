## Decisions

- D1 全链路清理 highlight：UI 区、styles、i18n key（food.superfoodTitle）、types/schema/迁移、种子标记、createFoodItem 参数、备份解析、restoreAllData、测试。旧 DB 中已存在的 highlight 列成为无害孤儿列（SELECT * 映射忽略）。
- D2 数据集 26 条与双语备注全保留，仅删 highlight: 1 标记。
- D3 主 spec 同步：删推荐位需求、数据集去 highlight、旧库兼容改写为 name_en/notes_en 幂等加列。

## Tasks

- [x] 1.1 types/schema/database/foodService/dataService 移除 highlight 全链路 + 种子去标记
- [x] 2.1 FoodLibraryScreen 移除推荐区 JSX/styles/memo + i18n key 清理
- [x] 3.1 vitest 断言与 fixture 清理；tsc/lint/vitest/validate（91/91）
- [x] 4.1 版本 1.7.2/24 + 构建 + ZIP
- [x] 4.2 主 spec 同步 + 归档
