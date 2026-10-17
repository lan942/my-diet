## 1. 种子数据

- [x] 1.1 在 `src/services/foodService.ts` 的 `SEED_FOODS` 末尾新增 `// —— 中国家常食物 ——` 分区，按 design.md D2 定稿数据表写入 19 条（碳水 5 / 蛋白质 5 / 脂肪 2 / 抗氧化蔬菜 4 / 膳食纤维 3），每条含双语 name/name_en、双语 notes/notes_en、per-100g 营养、按需 gi、portions 锚点
- [x] 1.2 核对无与既有 33 条重复的 canonical 中文名；notes 不含医疗声明，熟重/生重/可食部口径在名称或备注标注

## 2. 测试

- [x] 2.1 更新 `tests/foodLibrary.test.ts` 数量护栏：31–36 → 49–53（总量 52）
- [x] 2.2 新增营养值断言：馒头 223/P7.0/C47.0/F1.1、白粥 46/P1.1/C9.9/F0.3、猪里脊 155/P20.2/C0.7/F7.9、五花肉 518/P7.7/C0.9/F53.0（与 delta spec 场景一致，USDA pork belly 口径）
- [x] 2.3 新增中式份量锚点断言：馒头 1 个 100g、白粥 1 碗 250g、水饺 1 个 20g；既有全量 portions 合法性测试自动覆盖新条目（确认无遗漏）
- [x] 2.4 补充升级回填用例：以「馒头」为新 canonical 名验证缺失插入与用户同名条目保护（复用既有测试模式）

## 3. 校验与收尾

- [x] 3.1 `npx tsc --noEmit` 通过
- [x] 3.2 `npx vitest run` 全绿
- [x] 3.3 `npx expo lint` 通过
- [x] 3.4 `openspec validate add-chinese-common-foods --strict` 通过
- [x] 3.5 版本号顺延（app.json + android/app/build.gradle），构建 APK 打包 ZIP 交付设备验证
