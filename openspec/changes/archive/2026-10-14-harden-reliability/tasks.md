## 1. 平台步数（step-tracking）

- [x] 1.1 `platformSteps.ts` 新增 `toOffsetISO`（`±HH:mm`），`todayDayRange` 改用本地 00:00:00–23:59:59.999 + 偏移串
- [x] 1.2 `platformSteps.android.ts` 初始化失败复位 `initPromise`，三处 catch 改 `warnError`（仅 __DEV__）
- [x] 1.3 `stepService.upsertStepInternal` 读—判—写包 `withTransactionAsync`
- [x] 1.4 StepScreen：同步卡片仅当日显示、AppState active 重探可用性、同步后 reloadDay、保存后 setTodaySteps
- [x] 1.5 更新 platformSteps 单测：偏移正则 + 瞬时等价 + 事务 mock

## 2. 启动与全局状态（app-bootstrap）

- [x] 2.1 AppContext 新增 bootError/retryBoot/bootTick 与 loadSeqRef 序号令牌，过期结果丢弃
- [x] 2.2 getDb 失败复位 dbPromise；ensureSeedsOnce 失败复位 seedReadyPromise
- [x] 2.3 configRef/currentDateRef 同步移入 effect；保持 refresh 不 setLoading(true)
- [x] 2.4 App.tsx 新增首启错误屏与「重试」按钮（门控顺序 bootError 在 loading 前）

## 3. 数据管理（data-management）

- [x] 3.1 `validateBackupData`：日历/枚举/唯一 id/正克数/非负整数步数/非负营养/GI 0–100 整数/引用闭包
- [x] 3.2 parsePortionsBackup 宽松净化（非法条目 → null），parseBackup 末尾调校验并落库归一化数据
- [x] 3.3 新增 withReaderTransaction；JSON/CSV 导出改一致性快照 readBackupSnapshot
- [x] 3.4 resetAllData 支持同事务 seed 回调；resetEverything 改原子播种
- [x] 3.5 扩充 dataService 单测：合法边界 + 15 个语义非法用例 + portions 净化用例

## 4. 今日页与快捷记录（daily-intake / sheet-interactions）

- [x] 4.1 IntakeScreen：saving 防重入 + 按钮禁用、删除二次确认 ActionSheet、未知 meal 不兜底午餐、kcal 按克数缩放
- [x] 4.2 切日重置草稿（render 期 prevDate 模式）；汇总查询加 summarySeq 序号
- [x] 4.3 DateBar 当日右箭头置灰禁用，禁止前进到未来日
- [x] 4.4 QuickLogSheet：busy 上移外壳 + busyRef，遮罩/返回/手势关闭锁；失败保留抽屉展示错误
- [x] 4.5 QuickLog 内容包 ScrollView（sheet 限高 88%），错误与按钮固定滚动区外；MEAL_OPTIONS 移入渲染期
- [x] 4.6 插入成功后 refresh 失败吞掉（防重复 INSERT），toast 照弹
- [x] 4.7 ActionSheet 关闭首击锁：选项/确认/取消/遮罩/返回/手势统一 runClose，手势回弹复位
- [x] 4.8 PanResponder 改模块级工厂 + 内部插槽，消除 react-hooks render 期 ref 访问违规

## 5. 食物库（food-library）

- [x] 5.1 新增导出 validateGi（0–100 整数），create/updateFoodItem 调用；isLowGI 加 0 下界
- [x] 5.2 parsePortions 增加 finite + zh/en 非空字符串校验
- [x] 5.3 deleteFoodItem 引用检查 + 删除包单事务
- [x] 5.4 FoodLibraryScreen GI 表单校验（ERR_INVALID_GI）与快捷添加刷新 try/catch
- [x] 5.5 补 validateGi/parsePortions/isLowGI 边界单测

## 6. 引导与布局（onboarding / device-adaptation）

- [x] 6.1 RulerPicker 改 onLayout 实测 viewW 计算 sidePad；显示 clampedValue 钳制但不回写外部值
- [x] 6.2 BodyMetricsRulers 美制身高 40–98 in、体重 66–440 lb 显示钳制
- [x] 6.3 OnboardingScreen 预览改用 computeTarget（含 unit 依赖），删除 computeBmr/computeTdee 旧法

## 7. 国际化（localization）

- [x] 7.1 插值改函数式 replace，参数值中 `$&`/`` $` ``/`$'` 按字面量插入
- [x] 7.2 tError 修正为 `error.${code}` 键映射；未知 code/无 code 回退 error.generic；未知 locale 安全回退
- [x] 7.3 en/zh 对齐新增 7 个 key（retry/bootError/ERR_INVALID_GI/intake 删除标题与正文等）
- [x] 7.4 新增 i18n.test.ts（插值特殊模式、回退、tError 契约）

## 8. 数据库与测试基建

- [x] 8.1 新增 database.test.ts：WAL+SCHEMA 顺序、迁移四条 ALTER 幂等、失败复位、单例复用、reset/restore/只读事务行为
- [x] 8.2 各测试 mock db 补齐 withTransactionAsync

## 9. 门禁与交付

- [x] 9.1 `npx vitest run` 154/154 通过（基线 104，新增 50）
- [x] 9.2 `npx tsc --noEmit` 通过
- [x] 9.3 `npx expo lint` 通过（含 react-hooks v6 规则 7 处整改）
- [x] 9.4 `openspec validate add-chickpea-rice-foods --strict` 保持 valid
- [x] 9.5 `gradlew assembleRelease` 构建成功（v1.8.3 / versionCode 28），打包 my-diet-v1.8.3.zip 并删除旧 v1.8.1 包
- [ ] 9.6 设备验证：覆盖安装、白米饭/鹰嘴豆 QuickLog 份量、Health Connect 同步、错误提示本地化
