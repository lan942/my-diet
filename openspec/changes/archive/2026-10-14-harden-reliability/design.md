## Context

NutriPulse 是 React Native + Expo SDK 57 + TypeScript 的离线饮食记录应用，分层为 `types → db(expo-sqlite/WAL) → services（CRUD + 业务校验，抛 BizError 错误码）→ screens → App`，全局状态由 AppContext 提供，UI 弹窗全部自定义。全仓首次代码审查发现 1 个 critical（Health Connect 聚合时间串无时区偏移，Android 上 `Instant.parse` 必然抛错，平台同步实际不可用）、5 个 major 与若干 minor，另加双路交叉验证的 2 个新发现（Android 初始化失败状态被缓存、refresh 闭包结果跨日覆盖）。本设计为这批修复的实现方案（代码已落地，v1.8.3/versionCode 28），无 schema 变更、无新依赖、无备份格式版本变化。

## Goals / Non-Goals

**Goals:**
- 消除核心链路的确定性崩溃与数据损坏路径：平台同步可用、启动失败可恢复、备份脏数据不可落库。
- 消除跨日/并发竞态与重复写入：加载序号令牌、事务原子性、提交防重入。
- 统一输入校验与错误码国际化契约，使所有 BizError 能展示本地化文案。
- 修复小屏/布局类 UI 缺陷（刻度尺宽度、QuickLog 内容滚动）。
- 以 vitest 固化回归：用例 104 → 154，覆盖时间串、备份语义、数据库行为、i18n、GI/份量边界。

**Non-Goals:**
- 不做 schema 变更与数据库版本迁移（沿用既有幂等 ALTER）。
- 不改变备份文件格式/版本号；除明确的净化策略外不做旧数据迁移。
- 不修复审查中明确排除的三项（iOS nil 契约、category_id=0 孤儿数据、QuickLog 记日提示）。
- 不引入云端、账号或任何网络能力。
- 不重构导航、主题体系与种子数据内容（PORTION_BACKFILL 冻结集合保持不变）。

## Decisions

### 1. 平台步数：时区偏移由纯函数生成，失败状态不缓存
- `platformSteps.ts`（零 RN 依赖，Metro 按 `.android/.ios/.ts` 解析）新增 `toOffsetISO(d)`：用 `-getTimezoneOffset()` 拼出 `±HH:mm`；`todayDayRange()` 以本地 `new Date(y,m,d,0,0,0)`/`23:59:59.999` 构造瞬时再格式化，杜绝手工拼无时区串。
- Android 侧 `ensureInitialized()` 失败时把 `initPromise` 复位为 null（替代此前 `.catch(()=>false)` 的永久失败缓存）；SDK 状态/权限/聚合三处 catch 用 `warnError()` 仅在 `__DEV__` 输出，不吞成假成功。
- 备选：直接用 `Date.toISOString()`（UTC 串）——被否，因为聚合窗口会按 UTC 日界错位（东八区凌晨/深夜计入错误日期）。
- 同步入口仅在 `currentDate === todayString()` 渲染；AppState 回到 active 时以 active 标志重探一次可用性；同步成功后先 refresh 再 `reloadDay()` 回读。

### 2. 启动与刷新：序号令牌 + 失败复位 + 不全屏 loading
- AppContext 新增 `loadSeqRef`：每次 boot/refresh 自增并捕获序号，结果返回时序号不匹配即丢弃，根治「A 日结果覆盖 B 日」。
- `getDb` 失败 catch 中复位 `dbPromise=null`；种子单例 `ensureSeedsOnce` 失败复位 `seedReadyPromise=null`，支撑错误屏「重试」。
- 首启（config 仍为 null）失败才 `setBootError(true)` 展示错误屏；后台刷新失败保留旧数据。
- 铁律保持：refresh 永不 `setLoading(true)`（曾导致 RootTabs 导航树卸载回 initialRouteName，表现为保存后跳回第一 Tab）。

### 3. 备份：结构解析 → 归一化 → 领域语义校验 → 单事务恢复
- `dataService` 新增 `validateBackupData`：真实日历校验（`new Date(y,m-1,d)` 回填比对）、餐次/来源枚举、id 正整数且表内唯一、grams 严格正有限、steps 非负整数、营养非负有限、GI 0–100 整数、引用闭包（intake→food_item→category）。违例统一抛 `DataError(ERR_INVALID_BACKUP)`。
- portions 采用「宽松净化」而非整包拒绝：单条目非法（grams≤0/非有限、标签空）时该字段置 null——portions 是可选增强数据，拒绝整份旧备份的代价不对等；其余结构性/引用性违例仍严格拒绝。
- 恢复落库的是归一化对象（`data.config = normalized`）；新增 `withReaderTransaction`，JSON/CSV 导出在其中以 `Promise.all` 读多表，得到一致性快照。
- `resetAllData(configJson, seed?)` 支持种子回调：清表 + 配置 + 播种在同一事务；`deleteFoodItem` 引用检查 + 删除同事务；`upsertStepInternal` 读—判—写同事务。
- 备选：CHECK 约束/外键下沉到 SQLite——被否，会引入 schema 迁移且无法给出本地化错误码；应用层校验保持错误码→i18n 的既有契约。

### 4. 输入校验与错误码：服务层为唯一事实源
- 新增导出 `validateGi`（null/undefined 放行；否则须 0–100 整数，违例 `ERR_INVALID_GI`），`create/updateFoodItem` 统一调用；FoodLibrary 编辑表单做同构前置校验。
- `parsePortions`（食物库）与 `parsePortionsBackup`（备份）都要求 grams 正有限 + zh/en 非空字符串；`isLowGI` 加 `gi >= 0` 下界。
- 修复 i18n 契约断裂：错误码到键的映射为 `error.${code}`（此前 tError 用裸码与带前缀的字典 key 比对，导致所有 BizError 都退化通用文案）；插值改 `text.replace(re, () => replacement)` 函数式替换，参数值中的 `$&` 等按字面量处理；未知 locale 安全回退 en。

### 5. 竞态与提交防护（UI 层）
- IntakeScreen：`saving` 守卫 + 按钮禁用；删除改为 ActionSheet 二次确认（deleteId state，confirmDanger）；切日重置草稿采用「render 期 prevDate 比对 setState」的 React 官方模式（避免 effect 同步 setState 的级联渲染）；汇总查询加序号。
- QuickLogSheet：busy 状态上移到外壳，busyRef 经 effect 同步；遮罩/返回/手势在 busy 中全屏蔽；内容包 ScrollView、错误与按钮固定滚动区外，sheet 限高 88%。
- 插入成功后的 refresh 失败被有意吞掉（toast 照弹）：此时记录已落库，抛错会诱导用户重试而产生重复 INSERT。
- ActionSheet/QuickLog 的 PanResponder 改为模块级工厂 + 工厂内部可变插槽（关闭锁/canClose），useState initializer 内零 ref 捕获，满足 react-hooks v6 规则且长期存活的手势回调仍能读到最新状态。

### 6. 刻度尺：onLayout 实测宽度 + 仅显示钳制
- RulerPicker 删除 `useWindowDimensions`，改 `viewW` state + onLayout；`sidePad` 仅在拿到实测宽度后计算。显示值 `clampedValue = clamp(value, min, max)` 只用于文本与程序化滚动，**不** onChange 回写，保留 selfChangeRef/suppress 的既有手势不变式。
- OnboardingScreen 预览改用 `computeTarget({...DEFAULT_CONFIG, 当前输入, unit})` 单一事实源；美制尺显示值按 40–98 in / 66–440 lb 钳制。

### 7. 测试策略
- 纯逻辑直接测（platformSteps 的偏移正则 + 瞬时等价；validateGi/parsePortions/isLowGI；validateBackupData 的 1 合法 + 15 非法用例；i18n 插值/回退/tError）。
- database 行为用记录 SQL 序列的最小假 db（execAsync/runAsync/getAllAsync/withTransactionAsync）+ `vi.resetModules()` 隔离单例，覆盖 WAL/SCHEMA 顺序、迁移 ALTER 幂等、失败复位、单例复用、reset/restore 事务边界——不引入 sqlite WASM 依赖。
- 事务化改造后所有 vi.mock db 同步补齐 `withTransactionAsync`。

## Risks / Trade-offs

- [render 期 setState 重置草稿] → 仅在 `currentDate !== prevDate` 时触发一次并立即重渲染，是 React 官方支持的「adjusting state during render」模式；已通过 lint 与手动切日验证。
- [备份严格校验可能拒绝历史脏备份] → 仅结构/引用/枚举/取值域违例拒绝；portions 等增强字段走净化；CSV 导出对已删食物仍按既有「deletedFood」兜底。
- [序号令牌只防结果覆盖，不取消在途查询] → 单连接 SQLite 下在途读不产生写副作用，丢弃结果即可，无需 AbortController。
- [错误屏仅覆盖首启 config=null] → 已配置用户遇到 DB 故障时仍可能在具体操作处看到错误提示，但不会白屏；属刻意的最小打扰取舍。
- [PanResponder 插槽模式增加少量间接层] → 换取符合 react-hooks 规则的稳定手势实例；交互行为（阈值 120/1.2、180ms 动画）保持原值。

## Migration Plan

- 无数据库 schema 变更与备份版本变化，覆盖安装即生效；旧库的幂等迁移逻辑不变。
- 发布件：v1.8.3 (versionCode 28) release APK，覆盖安装验证；回滚即重装旧版本 APK（数据格式未变）。
- 设备验证点：覆盖升级、白米饭/鹰嘴豆 QuickLog 份量、Android Health Connect 同步（修复后首次预期成功）、错误提示本地化。
