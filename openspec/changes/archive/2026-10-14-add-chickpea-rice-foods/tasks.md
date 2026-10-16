## 1. 种子数据新增

- [x] 1.1 在 `src/services/foodService.ts` 的 `SEED_FOODS` 碳水分类段新增「白米饭 White Rice (Cooked)」：kcal 116 / protein 2.6 / carb 25.9 / fat 0.3 / gi 73；portions `1/2 碗（熟）`=75g、`1 碗（熟）`=150g（en: 1/2 Bowl Cooked / 1 Bowl Cooked）；双语 notes（熟重口径、训练补碳语义）
- [x] 1.2 在膳食纤维分类段新增「鹰嘴豆 Chickpeas (Cooked)」：kcal 164 / protein 8.9 / carb 27.4 / fat 2.6，**不写 gi**（遵守 gi 仅碳水分类不变式，低 GI 语义写入 notes）；portions `1/2 杯（熟）`=80g、`1 杯（熟）`=160g（en: 1/2 Cup Cooked / 1 Cup Cooked）；双语 notes
- [x] 1.3 自检双语字段完整（zh/en 名、notes_zh/notes_en 非空、en 名+分类无重复组合）

## 2. 升级补齐逻辑

- [x] 2.1 在 `ensureSeedFoods()` 中抽出单条插入助手（新装批量插入与升级补齐共用同一 INSERT，含 portions JSON 序列化与 gi 空值处理）
- [x] 2.2 重构非空库分支：保留现有 portions 回填；新增按 canonical 中文名集合（`SELECT name FROM food_item`）检测缺失种子，缺失项经分类定位（idByZh ?? idByEn，分类缺失则 continue）后调用插入助手
- [x] 2.3 确认幂等：已存在同名条目跳过不覆盖；重复启动插入数为 0；新装（空库）路径行为不变（28 条全量写入）

## 3. 单元测试

- [x] 3.1 更新 `tests/foodLibrary.test.ts` 种子数量断言（24–27 放宽为 26–30）与用例描述
- [x] 3.2 新增白米饭/鹰嘴豆种子断言：分类归属、营养值数组、gi（73 / undefined）、portions 克数数组与双语标签
- [x] 3.3 新增升级补齐测试（mock getDb，按真实 WHERE 语义模拟行变更）：非空库缺 2 条 → 捕获对应 INSERT 且历史 16 条回填；同名用户条目 → 不插入且 portions 保持 NULL；分类缺失 → 零插入不抛错；PORTION_BACKFILL_V180 冻结快照一致性
- [x] 3.4 运行 `npx vitest run` 全部通过（104/104）
- [x] 3.5 代码审查修复（TRAE-code-review）：portions 回填冻结为 16 个历史种子名 allowlist，新种子只走缺失插入，同名用户自建行零污染；消除新种子空转 UPDATE；proposal gi=28 文档对齐

## 4. 静态校验

- [x] 4.1 `npx tsc --noEmit` 无类型错误
- [x] 4.2 `npx expo lint` 无新增告警
- [x] 4.3 `openspec validate add-chickpea-rice-foods --strict` 通过

## 5. 版本、构建与交付

- [x] 5.1 版本号同步：app.json version=1.8.3、versionCode=28；android/app/build.gradle versionName/versionCode 手动同步（与 app.json 对齐，不依赖 prebuild）
- [x] 5.2 执行 `.\gradlew.bat assembleRelease`（跳过 clean，复用 codegen 产物），确认日志尾 BUILD SUCCESSFUL（后台沙箱 exit 1 误报以日志为准，2026-10-15 46s 构建成功）
- [x] 5.3 APK 打包为 `my-diet-v1.8.3.zip`（根目录，供微信传输），清理旧版交付 ZIP（v1.8.1 已删）
- [ ] 5.4 设备验证：覆盖安装旧版本后食物库出现白米饭/鹰嘴豆、Quick Log 默认份量模式且克数联动正确；新装路径两条目同样可见
