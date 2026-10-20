## 1. 服务层

- [x] 1.1 intakeService 新增 `updateIntake(id, { grams, meal })`：克数沿用 `ERR.INVALID_GRAMS` 校验（有限且 > 0），仅 UPDATE grams 与 meal 两列，不触碰 created_at / date / food_item_id
- [x] 1.2 新增纯函数 `resolvePortionPrefill(portions, grams)`：遍历锚点 × 数量（0.5–8、步进 0.5），返回首个满足 `round(qty × anchor.grams) === grams` 的 `{ anchorIdx, qty }`，未命中返回 null
- [x] 1.3 单测：updateIntake 正常更新/非法克数拒绝/created_at 保留；resolvePortionPrefill 命中、多锚点取首个、边界 0.5 与 8、未命中返回 null

## 2. QuickLogSheet 编辑模式

- [x] 2.1 新增可选 props：`editingLog: IntakeLog | null`（默认 null = 新增态）；外壳 key 在编辑态改用 `log.id`，保证每次打开重新挂载
- [x] 2.2 编辑态初始值：meal 预填当前记录餐次（旧中文餐次值按 LEGACY 映射归一）；grams 经 resolvePortionPrefill 命中时预填份量模式（锚点 + 数量），否则预填克数模式且显示层不做量程钳制
- [x] 2.3 编辑态文案切换：标题与提交按钮走新增 i18n key（如 `intake.editTitle` / `intake.saveEdit`），hint 可复用或新增；提交回调语义由调用方决定（组件仅透传 grams/meal）
- [x] 2.4 新增态行为零变化：FoodLibraryScreen 不传 editingLog，既有 Quick Log 测试全部保持绿色

## 3. IntakeScreen 接线

- [x] 3.1 记录行右侧新增铅笔编辑按钮（44×44、`colors.accentSoft` 圆底，与步数卡编辑入口同语言），位于删除按钮左侧；`food === undefined` 的孤儿行不渲染该按钮
- [x] 3.2 新增编辑态状态：`editingLog: IntakeLog | null`，点击铅笔置位并拉起 QuickLogSheet（编辑态），提交回调调用 `updateIntake(l.id, { grams, meal })` 后 `refresh()` + 成功轻提示 + Light 触觉
- [x] 3.3 切日重置逻辑补充清空 `editingLog`（随既有 prevDate 模式），避免跨日期残留抽屉
- [x] 3.4 i18n：zh/en 新增编辑入口 accessibilityLabel、抽屉标题、保存按钮、成功轻提示等文案

## 4. 验证与交付

- [x] 4.1 `vitest run` 全绿（含新增用例）
- [x] 4.2 `tsc --noEmit` 与 `eslint` 无错误
- [x] 4.3 `openspec validate add-intake-record-edit --strict` 通过
- [x] 4.4 版本号顺延至 v1.9.5 / versionCode 34（app.json + android/app/build.gradle 手工同步）
- [x] 4.5 `gradlew clean assembleRelease`（dangerouslyDisableSandbox）构建 APK，UTF-16LE 字节探针验证新鲜度，打包 my-diet-v1.9.5.zip 待微信交付
