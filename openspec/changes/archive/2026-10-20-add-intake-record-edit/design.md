## Context

「今日」页摄入记录行目前仅提供删除入口（trash 图标 → ActionSheet 二次确认）。`intakeService` 只有 `createIntake` / `deleteIntake` / `listIntake`，无更新方法。QuickLogSheet 已具备成熟的「份量 ⇄ 克数」双模式录入、餐次分段、实时营养预览与 sheet-interactions 关闭锁定能力，目前仅服务于食物库的新增场景（`onAdd(grams, meal)`）。

约束：全部数据本地 SQLite；抽屉交互必须满足 sheet-interactions 能力；所有弹层禁用系统 Alert；i18n 双语文案；服务层抛 BizError。

## Goals / Non-Goals

**Goals:**
- 已存在的 intake_log 行可就地修改 grams 与 meal，保存后列表与当日汇总即时刷新
- 编辑交互与 Quick Log 新增交互完全一致（双模式、预览、锁定语义），用户零学习成本
- 份量模式下能根据当前克数反解出锚点与数量并预填，减少重复操作

**Non-Goals:**
- 不支持在编辑中更换食物（food_item_id 不可变；换食物 = 删除 + 重新记录）
- 不支持修改记录日期（编辑历史日期的记录时日期保持原值）
- 不改动删除流程、备份/恢复格式与数据库 schema

## Decisions

### D1: 服务层新增 `updateIntake(id, { grams, meal })`，而非复用 create 的删后重建
UPDATE 既有行保留 `created_at` 原始时间戳与行 id，备份/导出语义稳定；删后重建会丢失创建时间并产生新 id。grams 校验沿用 `ERR.INVALID_GRAMS`（正数、有限），与 createIntake 一致；meal 由 UI 约束在四选一枚举内，服务层不重复校验（与 createIntake 现状一致）。

### D2: 扩展 QuickLogSheet 支持编辑模式，而非新建 EditIntakeSheet
备选 A：新建独立 EditIntakeSheet 组件——会复制约 300 行双模式/预览/手势锁定逻辑，后续两份漂移。备选 B（采纳）：QuickLogSheet 增加可选编辑入参（初始 grams/meal、标题与按钮文案 key、提交回调），FoodLibraryScreen 走新增态，IntakeScreen 走编辑态，共享全部交互与 sheet-interactions 合规逻辑。组件内部以 `editingLog !== null` 区分文案与提交语义；外壳 keyed by `log.id`（编辑）/ `food.id`（新增）保证每次打开重新挂载、状态干净。

### D3: 份量锚点反解为纯函数 `resolvePortionPrefill(portions, grams)`
遍历锚点 × 数量（0.5–8、步进 0.5），命中 `round(qty × anchor.grams) === grams` 即返回 `{ anchorIdx, qty }`，否则返回 null。纯函数可直接 vitest 覆盖（含多锚点命中时取首个、边界 0.5/8、四舍五入容差）。命中 → 预填份量模式；未命中（含无 portions 的食物）→ 预填精确克数模式。克数模式沿用既有「显示层不做量程钳制」约定：1–9g 的历史记录如实显示数值，尺身 pin 吸附边界。

### D4: 编辑入口为记录行内铅笔图标，与删除并列
与步数卡编辑入口（铅笔 + `colors.accentSoft` 圆形底）同视觉语言，44×44 触达热区。不采用整行点击：避免与删除按钮争夺手势，且行点击无可发现性。孤儿记录（食物已被删除，`food === undefined` 的行）不提供编辑入口——份量/预览均依赖食物数据，此类行仅保留删除。

### D5: 保存语义与新增一致
提交进行中锁定遮罩/返回/手势关闭 + 按钮禁用；失败保留抽屉并在滚动区外展示 `tError(e)`；成功关闭抽屉 + 轻提示 + `refresh()` 原地更新（不触发路由重置）。防重入由既有 busy 锁覆盖。

## Risks / Trade-offs

- [QuickLogSheet  props 膨胀，新增/编辑两态交织] → 编辑态仅新增 3 个可选入参（editingLog、标题/按钮文案由 editingLog 派生、onSubmit 语义由调用方闭包决定），组件内部不感知服务层；新增态行为零变化由既有测试兜底
- [反解预填与用户预期不符（如 200g 既可解为掌心×2 也可解为杯×1）] → 取锚点数组首个命中项，用户可自由改选；未命中落到克数模式始终正确可用
- [编辑历史日期记录后误触发当日视图刷新] → 编辑提交只调用 `refresh()` 原地更新 currentDate 的数据，不调用 `setCurrentDate`，无跳转

## Migration Plan

纯客户端增量，无 schema 变更。实现 → vitest 全绿 → openspec validate --strict → 版本号顺延（v1.9.5 / versionCode 34）→ clean 构建 APK 交付。回滚 = revert 对应 commit，无数据迁移负担。

## Open Questions

（无）
