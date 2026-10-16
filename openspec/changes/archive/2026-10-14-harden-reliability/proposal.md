## Why

全仓首次代码审查发现 20 项问题与 2 项交叉验证新发现：其中 Health Connect 聚合因时间串不带时区偏移在 Android 上必然抛错（平台同步实际不可用）；启动/刷新失败会被永久缓存或在跨日时产生竞态覆盖；备份恢复缺少领域语义校验，脏数据可直接落库；多个写入入口缺少防重入/原子事务保护；刻度尺在宽度未实测时按错误窗口布局；错误码国际化契约断裂导致所有业务错误提示退化为通用文案。这些问题直接影响核心链路可用性与数据安全，需要统一修复并补齐回归测试。

## What Changes

- 修复 Android Health Connect 聚合时间窗：统一生成带本地时区偏移（`±HH:mm`）的 ISO 串；初始化/权限/聚合失败不再缓存失败状态，可重试；同步卡片仅在当日显示，应用回前台时重新探测平台可用性。
- 新增首启加载失败屏与「重试」入口；后台刷新引入序号令牌，过期结果 SHALL NOT 覆盖新日期数据；数据库连接与种子初始化失败后均复位缓存，允许重试；后台刷新 SHALL NOT 切换全屏 loading（防止导航树卸载回跳 Tab）。
- 备份恢复前执行结构 + 领域语义校验：真实日历日期、餐次/来源枚举、id 正整数且表内唯一、克数严格正有限、步数非负整数、营养非负、GI 0–100 整数、分类/食物引用闭包完整；非法份量字段宽松净化为 null（兼容旧备份）；任一校验违例拒绝恢复且不动现有数据。
- 导出 JSON/CSV 改在单一只读事务中读取多表，保证一致性快照；恢复落库使用归一化后的数据；清空摄入、全量重置（含种子播种）、删除食物（引用检查 + 删除）均在单事务内原子提交。
- 摄入记录保存增加防重入守卫与进行中按钮禁用；删除改为危险操作二次确认抽屉；切换日期时重置录入草稿；当日汇总请求加序号防竞态；日期栏右箭头在当日禁用，不可前进到未来日；列表行热量统一按克数实时缩放。
- QuickLog 抽屉保存进行中锁定遮罩/返回/手势关闭通道，失败时保留抽屉展示错误；内容区可滚动并固定底部错误与按钮。
- 食物 GI 全链路校验：仅接受 0–100 整数（0/100 边界合法），非法值在服务层与编辑 UI 均拒绝并提示；低 GI 判定增加下界；份量预设要求 grams 为正有限数且中英文标签非空；快捷添加插入成功后刷新失败 SHALL NOT 抛出（避免重试造成重复插入）。
- 刻度尺改用 onLayout 实测自身宽度布局；显示值钳制在 min/max 区间但不回写外部值；引导页美制身高/体重取值钳制在合法范围；引导目标预览改由 computeTarget 按当前输入（含单位制）实时计算。
- i18n 插值按字面量替换（替换值中的 `$&`/`` $` ``/`$'` 不触发特殊模式）；修正错误码翻译契约为 `error.<code>`；未知 locale 标记安全回退英文。
- 通用底部抽屉关闭流程加首击锁：关闭动画窗口内选项/确认/遮罩/手势均不得二次触发；回弹时恢复可交互。
- 配套回归测试：平台步数时间串与事务 mock、备份语义校验 16 例、数据库行为（初始化/迁移幂等/失败复位/事务/恢复）、i18n 插值与错误码、GI/份量/低 GI 边界；全量门禁 vitest 154 项、tsc、expo lint、openspec validate 全绿。

## Capabilities

### New Capabilities
- `app-bootstrap`: 首启加载失败可重试错误屏、数据库/种子初始化失败不缓存、后台刷新竞态令牌与不全屏 loading 的启动与数据加载契约。
- `sheet-interactions`: 通用底部抽屉的关闭安全：动画窗口防重复触发、破坏性操作进行中锁定关闭通道。

### Modified Capabilities
- `step-tracking`: 平台同步时间窗时区偏移、失败可重试、同步入口仅当日可见、回前台重探可用性。
- `data-management`: 备份恢复的结构与领域语义校验、非法份量净化、只读事务一致性快照、恢复/重置/清空的原子事务边界。
- `daily-intake`: 保存防重入、删除二次确认、切日重置草稿、汇总竞态防护、禁止前进到未来日、QuickLog 保存锁与可滚动布局。
- `food-library`: GI 0–100 整数全链路校验、低 GI 下界、份量数据合法性、快捷添加幂等、删除食物原子化。
- `localization`: 插值字面量替换、`error.<code>` 翻译契约、未知 locale 安全回退。
- `onboarding`: 目标预览实时按 computeTarget 计算（含单位制）、美制身高体重取值钳制。
- `device-adaptation`: 刻度尺 onLayout 实测宽度布局与显示值钳制。

## Impact

- 代码：`src/services/`（platformSteps*、stepService、foodService、dataService、errors）、`src/db/database.ts`、`src/state/AppContext.tsx`、`App.tsx`、`src/screens/`（Intake、Step、FoodLibrary、Onboarding）、`src/components/`（QuickLogSheet、ActionSheet、RulerPicker、DateBar、onboarding/BodyMetricsRulers）、`src/i18n/`（index + en/zh 共新增 7 个 key）。
- 测试：新增 `tests/database.test.ts`、`tests/i18n.test.ts`，扩展 platformSteps/dataService/foodStep 测试；用例总数 104 → 154。
- 数据：无 schema 变更、无版本号变更、无新增依赖；备份文件格式不变（仅校验更严格，旧备份非法字段按净化策略兼容）。
- 交付：v1.8.3 (versionCode 28) release APK 重新构建并打包 ZIP。
