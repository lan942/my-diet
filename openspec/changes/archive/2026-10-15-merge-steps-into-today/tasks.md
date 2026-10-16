## 1. 平台步数接口泛化

- [x] 1.1 `src/services/platformSteps.ts`：新增纯函数 `dayRangeForDate(date: string, now?)`（本地日界 + ±HH:mm 偏移），`todayDayRange` 改为对其当日入参的薄封装；接口 `PlatformSteps.readTodaySteps()` 重命名为 `readStepsForDate(date: string)`；降级实现同步更新
- [x] 1.2 `src/services/platformSteps.android.ts`：`readStepsForDate` 用 `dayRangeForDate(date)` 构造 Health Connect 聚合时间窗，保持初始化失败可重试、异常返回 null 的现有行为
- [x] 1.3 `src/services/platformSteps.ios.ts`：TS 接口改 `readStepsForDate(date)`；调用原生新方法，并做方法存在性探测——原生缺失时当日回退 `readTodaySteps()`、历史日期返回 null（旧原生包降级不崩）

## 2. 步数服务与连接标志

- [x] 2.1 `src/services/stepService.ts`：删除手动录入 `upsertStep` 导出；`syncPlatformSteps(date, steps)` 重命名为 `recordPlatformSteps(date, steps)`，取消 manual 保护与「取大值」逻辑，改为平台权威覆盖（事务 upsert，source 恒为 platform，负数仍抛 StepError）；保留 list/get/mapRow/旧 manual 映射
- [x] 2.2 删除 stepService 中固定系数 `stepsToKcal`（迁移至 3.1 的能量平衡服务）
- [x] 2.3 新增健康连接标志的本地 KV 存取（app_config 独立键 `steps_connection`，值 `connected`/缺省）：getStepsConnection / setStepsConnected，与 main 配置 JSON 隔离、互不影响校验

## 3. 能量平衡纯逻辑

- [x] 3.1 新增 `src/services/energyBalance.ts`：`stepsToKcal(steps, weightKg) = Math.round(steps * 0.0005 * weightKg)`；`computeEnergyBalance({targetKcal, intakeKcal, steps, weightKg})` 返回 `{stepsKcal, adjustedCalorie, remaining, netKcal}`（steps 为 null/0 时 stepsKcal=0）
- [x] 3.2 在 `src/types.ts` 增加 `EnergyBalance` 返回类型（如需要）

## 4. 自动同步 hook

- [x] 4.1 新增 `src/hooks/useDeviceSteps.ts`：入参 `date`，返回 `{availability, syncState, steps, connect, syncNow}`；挂载 + AppState `active` 时静默探测 availability（不索权）
- [x] 4.2 自动读取：useFocusEffect + AppState active + date 变化时，availability=available 且已连接（KV 标志）则静默读 `readStepsForDate(date)` 并写 `recordPlatformSteps`；connect() 是唯一 requestPermissions 调用路径，成功后写 KV 标志并立即同步当日
- [x] 4.3 并发与竞态：同日期读取单飞（in-flight Promise 复用）、15s 成功结果节流、递增 seq 丢弃旧日期迟到结果；写入成功后调 `refresh()`（严禁 setLoading），失败不缓存永久失败
- [x] 4.4 状态派生：未连接/同步中/已连接/拒绝/不可用五态；当前日期步数从 AppContext.stepLogs 按 date 派生，同步完成 refresh 后即时更新

## 5. 今日页 UI 整合

- [x] 5.1 `IntakeScreen.tsx` 在 DateBar 下方新增步数卡：connected 态（青色 footsteps 图标 + 步数大数字 + ≈kcal + 同步按钮与状态）、未连接态（用途说明 + Connect 按钮）、denied 态（错误文案 + 重新连接）、unavailable 态（紧凑不可用说明）；历史日期复用同卡展示本地行/补读态
- [x] 5.2 达成率卡热量 ProgressBar 改用 `adjustedCalorie` 目标，卡内新增一行「净热量 X · 剩余 Y kcal」；蛋白/碳水/脂肪进度条目标不变；全部数值经 useMemo 由 computeEnergyBalance 纯派生
- [x] 5.3 步数卡视觉走 theme tokens（步数青 #06B6D4）、Soft Card 风格；所有 Text 加 maxFontSizeMultiplier（大数字 2×、正文 1.4×）；反馈复用 Toast，不引入系统 Alert

## 6. 导航收敛与清理

- [x] 6.1 `App.tsx`：移除 Steps 路由，RootTabParamList/TAB_ICONS/TAB_KEYS 收敛为 Today/Food/Profile 三项（保持 initialRouteName=Today 与现有图标聚焦态逻辑）
- [x] 6.2 删除 `src/screens/StepScreen.tsx`；清理全仓对它的引用
- [x] 6.3 i18n（en.ts/zh.ts 双写）：删除 `tab.steps`、`steps.today/inputTitle/label/labelPh/saveOverwrite/history/empty`、`sync.protected`；新增 `steps.cardTitle/connect/syncing/unavailable/notConnected`、`energy.net/remaining/adjustedHint` 等 key；复用语义保持 en/zh 对齐

## 7. iOS 原生模块

- [x] 7.1 `modules/nutripulse-health/ios/NutriPulseHealthModule.swift` 新增 `readStepsForDate(date)` AsyncFunction：按 "YYYY-MM-DD" 经 Calendar 构造 `[startOfDay, nextDay)` 谓词，复用 HKStatisticsCollectionQuery 聚合返回步数
- [x] 7.2 挂起项记录：iOS prebuild/真机回归待 macOS 环境执行（TS 降级路径保证旧原生包不崩）

## 8. 测试

- [x] 8.1 更新 `tests/platformSteps.test.ts`：`dayRangeForDate` 任意日期时间窗/偏移/补零、历史日期解析回瞬时边界；降级实现改断言 `readStepsForDate`
- [x] 8.2 重写 stepService 同步用例：recordPlatformSteps 覆盖 manual 行（source 变 platform）、覆盖数值下降、无行插入、事务外壳、负数抛错、旧 source 缺省映射 manual；删除 upsertStep/取大值/保护语义用例
- [x] 8.3 新增 `tests/energyBalance.test.ts`：70kg 1 万步=350、80kg=400、0/null 步数=0、调整后目标/剩余/净热量（TDEE2000+350、摄入1800→2350/550/1450）
- [x] 8.4 迁移 `tests/foodStep.test.ts` 中 stepsToKcal 用例到新签名（体重参数）；其余用例不动
- [x] 8.5 hook 单飞/seq/节流逻辑内联于 RN hook（依赖 AppState/navigation/Context，抽离纯函数价值过低）经集成验证；i18n 测试新增双语 key 集合对齐守卫、新增 key 非空、已删 key 不存在断言

## 9. 校验与交付

- [x] 9.1 `npx tsc --noEmit`、`npx expo lint`、`npx vitest run` 全绿（168/168）
- [x] 9.2 `openspec validate merge-steps-into-today --strict` 通过；全仓搜索确认无 StepScreen/tab.steps/手动录入残留引用
- [x] 9.3 版本号三处同步：app.json（version 1.9.0 / versionCode 29；因 28 已被 v1.8.3 占用顺延）、android/app/build.gradle（versionName 1.9.0 / versionCode 29）
- [x] 9.4 gradle 构建 release APK（BUILD SUCCESSFUL in 1m 2s，exit 1 为 Kotlin daemon 沙箱误报），output-metadata 核对 1.9.0/29，打包 my-diet-v1.9.0.zip（19.4MB）并清理旧 v1.8.3.zip，待微信传输测试
