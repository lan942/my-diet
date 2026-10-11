## 1. 数据层

- [x] 1.1 types.ts：FoodItem 增加 `name_en: string | null`、`notes_en: string | null`
- [x] 1.2 schema.ts DDL + database.ts ensureMigrations 幂等加列（PRAGMA table_info 判重）
- [x] 1.3 foodService：ItemRow/mapItemRow/INSERT 补列；createFoodItem 接受 name_en?/notes_en?（默认 null）；ensureSeedFoods 双语双写（不再按 locale 二选一）

## 2. 服务层与备份

- [x] 2.1 foodService 新增 `foodDisplayName(item, locale?)` / `foodDisplayNotes(item, locale?)` 纯函数（en 缺失回退 name/notes）
- [x] 2.2 dataService：parseBackup 补 name_en/notes_en（optString 缺省 null）；buildBackup 自然带出；restoreAllData INSERT 补列；CSV 导出食物名走显示函数

## 3. 展示位点

- [x] 3.1 FoodLibraryScreen：列表卡/推荐卡名称与备注换用显示函数（编辑表单预填存储值不变）
- [x] 3.2 QuickLogSheet 食物名、IntakeScreen 今日记录行 `l.food?.name` 换用显示函数

## 4. 测试与校验

- [x] 4.1 vitest：显示函数四场景（zh/en/en 回退/自定义食物）+ 种子双写断言；既有 fixture 补新字段
- [x] 4.2 tsc + expo lint + vitest 全量（91/91）+ openspec validate

## 5. 交付

- [x] 5.1 版本号 1.7.1 / versionCode 23 同步 app.json 与 build.gradle
- [x] 5.2 gradlew assembleRelease 构建 + my-diet-v1.7.1.zip 交付
