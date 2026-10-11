## Context

当前 ProfileScreen（src/screens/ProfileScreen.tsx）为整页平铺表单：每日目标展示卡 + 基础信息卡（性别 chip / TextField / 单位 Segmented / 活动量列表）+ 营养配比卡（预设 + 手动配比 TextField）+ 全局「保存全部」按钮。首启引导 OnboardingScreen 已有高质量的 4 步 UI（目标卡 / RulerPicker 刻度尺 / 性别卡 / 强度行），但全部内联在 step 条件渲染中，无法复用。底部 Tab 顺序为 Profile/Food/Today/Steps。导出/导入/清空能力目前不存在。

约束：全离线本地应用；分层架构 types → db → services → screens；i18n 自研（en/zh）；全局状态经 AppContext（saveAndRefreshConfig 已保证 config 变更实时广播到所有页面，首页热量环已消费 config）。

## Goals / Non-Goals

**Goals:**
- 「我的」页改为低信息密度的摘要卡 + 偏好数据区，编辑走单步 Bottom Sheet 即存即生效
- 引导 4 步 UI 抽离为受控可复用组件，引导页与编辑抽屉共用（单一事实来源）
- 新增本地导出（JSON/CSV）、导入恢复、清空重置能力
- Tab 顺序调整为 今日/食物库/步数/我的，初始 Tab 今日

**Non-Goals:**
- 不引入云端同步、账号体系
- 不引入第三方 Bottom Sheet 库（react-native-modal 等）
- 不改变 AppConfig 字段、数据库 schema 与 TDEE 计算逻辑
- 不新增步数目标设定（草图中的 "8,000 steps" 不落地，无对应既有功能）
- 不实施 Dark Mode 深色模式（样式经 theme tokens 引用为后续切换留路）

## Decisions

### D1：引导 4 步 UI 抽离为受控组件（核心决策）
将 OnboardingScreen 中 4 步内容抽为 `src/components/onboarding/` 下 4 个组件：
- `GoalPresetCards`（props: `value: GoalPreset | null`, `onChange`）
- `BodyMetricsRulers`（props: `age/heightCm/weightKg/unit`, `onChange*`；内含单位 Segmented 与 3 个 RulerPicker，内部处理公/美制换算与显示）
- `GenderOptionCards`（props: `value: Gender`, `onChange`）
- `ActivityLevelRows`（props: `value: number`, `onChange`）

组件为纯受控展示（本地触觉反馈保留在组件内），状态归调用方（引导页 = 整个向导草稿 state；编辑抽屉 = 当前主题的草稿 state）。理由：引导页与抽屉是同一 UI 的两种宿主，抽离是复用的唯一干净路径；受控设计让两处行为天然一致。`LEVEL_COLORS`、`GENDER_OPTIONS` 等常量随组件迁移。
*备选：抽屉单独复制一份 UI —— 立即产生双份漂移风险，否决。*

### D2：抽屉容器用 RN Modal + 既有 sheet 样式，不引第三方库
新建 `src/components/EditSheet.tsx`：通用单步抽屉（grabber + 标题 + 说明 + 内容 ScrollView + Save 主按钮），`Modal animationType="slide"` + 遮罩点击关闭 + 手势下拉关闭，视觉按 D10（渐变圆角 Bottom Sheet，含 `useSafeAreaInsets` 底部内边距）。ProfileScreen 内用一个 `activeSheet: 'goal' | 'body' | 'gender' | 'activity' | null` state 控制四个抽屉实例（或单实例按主题切换内容）。
*备选：@gorhom/bottom-sheet —— 多一个重依赖且需 gesture-handler 配置，收益不足，否决。*

### D3：保存语义 = 抽屉内 Save 单点提交，校验失败留在抽屉
每个抽屉打开时从 config 拷贝草稿；Save 时组装 patch 调 `saveAndRefreshConfig`（内部走 configStore 既有校验），成功后关抽屉 + Light Impact 触觉；失败 Alert(tError) 且抽屉保持打开。单位偏好例外：偏好区 Segmented 点选即 `saveConfigPatch({ unit_system })` 即时保存（无草稿态）。性别/活动量/目标为单选草稿 + Save 确认，符合用户「点击 Save 后抽屉下滑消失」的描述。

### D4：Goal 摘要兼容存量自定义配比
摘要 = 匹配 `GOAL_PRESETS`（±0.001 容差）时显示模板名 + `computeTarget(config).daily_calorie` 取整 kcal；不匹配任何模板（存量用户手动配比过）时显示 `P30/F25/C45` 百分比式摘要 + 目标 kcal。目标抽屉仅提供 3 个模板（自定义配比输入随平铺表单一并移除，见 proposal BREAKING）。

### D5：数据管理服务拆纯逻辑与 IO
新增 `src/services/dataService.ts`：
- `buildBackup(config, intakeLogs, stepLogs, categories, items): string` → `{ version: 1, exportedAt, config, intake_logs, step_logs, food_categories, food_items }`
- `parseBackup(json: string): BackupData` → 校验 version === 1 与关键结构/字段合法性，非法抛 `BizError(ERR.*)`
- `buildIntakeCsv(intakeLogs): string` → 表头 + 数据行，值转义逗号/引号
纯函数全部可 vitest 测试。文件 IO 在同文件 platform 无关封装：导出用 `expo-file-system` 写 cache 目录临时文件 + `expo-sharing` 分享面板；导入用 `expo-document-picker` 选 JSON + `parseBackup` 校验 + service 层覆盖写入 + `AppContext.refresh()`。新增依赖仅这 3 个 Expo 官方包。
*备选：CSV 也做成全量导出 —— 摄入记录 CSV 已覆盖"表格再加工"需求，JSON 才是全量备份，职责更清晰。*

### D6：导入恢复 = 覆盖式 + 失败零副作用
导入流程：parseBackup 校验通过后，按序执行「清空各表 → 写入备份 config/记录/食物库」；db 层新增 `restoreBackup(data)`（单个事务，失败回滚保证零副作用），完成后 `refresh()`。校验失败时根本不触碰数据库。

### D7：清空重置 = 全表清空 + 配置默认 + 回引导
db 层新增 `resetAllData()`（事务：清空 intake_logs / step_logs / food_items / food_categories / config，config 写回默认值 `onboarded=false`），随后重新执行种子初始化（`ensureSeedCategories/ensureSeedFoods` 直接调用，绕过 `ensureSeedsOnce` 的模块级 once 缓存），`refresh()` 后 Root 因 `onboarded=false` 自动展示引导向导。二次确认用 `Alert.alert` destructive 按钮。

### D8：Tab 重排 + initialRouteName
App.tsx：`Tab.Screen` 注册顺序改为 Today / Food / Steps / Profile，并设 `initialRouteName="Today"`（否则首 Tab 会变成食物库，不符合「今日是核心页」预期）。

### D9：i18n 与可达性
新增 `settings.*` key（分区标题、4 张卡标题、Edit、抽屉标题/说明、数据管理各项、确认弹窗文案），en/zh 同步补齐；沿用 `maxFontSizeMultiplier` 与 `maxWidth: 640` 居中约束。摘要卡编号 1-4 + 右侧 Edit 文字按钮；偏好行用图标 + 文字 + 右侧控件/箭头；清空行为红色 danger 样式。

### D10：视觉风格对齐 2026-10-11 固化的 UI Design Direction（Modern & Premium）
本页所有新增 UI SHALL 严格遵循项目既定视觉语言，实施时从 `src/theme.ts` tokens 取值（colors/spacing/macroColors/cardShadow），禁止硬编码色值：

- **摘要卡 = Soft Card**：`colors.card` 背景 + `cardShadow`（0px 4px 12px rgba(0,0,0,0.04)）、圆角 16；每张卡左侧带 **4px 营养素语义色条**（复用引导目标卡的 goalBar 模式），四卡 1:1 映射语义色：Goal→总热量橙 `#FF6B4A`、Body Metrics→蛋白质靛蓝 `#6366F1`、Biological Sex→脂肪琥珀 `#F59E0B`、Activity Level→碳水翡翠绿 `#10B981`；卡内编号用对应语义色小字点缀，正文保持 `colors.text`/`colors.muted` 中性色（中性卡片 + 小面积语义色点缀）
- **EditSheet = 渐变圆角 Bottom Sheet**：顶部圆角 24 + grabber + 轻量微渐变背景（自上而下的极浅单色渐变，避免大面积高饱和）；内容区 ScrollView；支持**手势下拉关闭**（PanResponder 轻量实现：下拉超过阈值或快速下滑即关闭）+ 遮罩点击关闭，不跳页
- **触觉反馈**：点 Edit / 拖刻度尺 / 单选切换 Light Impact（`Haptics.selectionAsync`），保存成功 Success（`Haptics.notificationAsync`）——与引导页既有行为一致
- **单位 Segmented Control**：复用 iOS 风格带阴影滑块的 `SegmentedControl` 组件，内联在偏好行右侧或下方
- **摘要数值更新**：目标 kcal 变化沿用 Count-Up 平滑滚动（复用 `AnimatedNumber`），无需新动画代码
- **Dark Mode 留路**：本变更不实施深色模式（Non-Goal），但所有色值必须经 theme tokens 引用（`darkColors` 保留集不动），后续切深色只需换 token
- **分区标题**：PROFILE & TARGETS / PREFERENCES & DATA 用 `colors.muted` 小号大写字母间距（letterSpacing 1~1.5）的 eyebrow 样式，参考 MacroFactor 的分区节奏

## Risks / Trade-offs

- [引导页重构回归] 4 步 UI 抽离可能破坏引导流程 → 抽离后引导页状态机与导航逻辑不动，仅替换渲染块；实施后人工回归 4 步全流程 + 完成弹窗
- [RulerPicker 在抽屉内布局] 抽屉高度有限，3 个刻度尺需滚动 → 抽屉内容区用 ScrollView，RulerPicker 保持既有高度；抽屉内拖动与 Modal 手势冲突低（水平滚动 vs 垂直 Modal）
- [导入覆盖导致数据丢失] 用户误导旧备份 → 校验阶段零写入；覆盖前无需再确认（选文件即明确意图），但导入入口文案标注「覆盖当前数据」
- [清空重置误触] → 红色样式 + Alert destructive 二次确认 + 文案明示「恢复出厂并重新引导」
- [自定义配比用户升级后失去手动输入] → 摘要仍正确展示其配比（D4），TDEE 计算不受影响；如需改配比只能选 3 模板（产品决策，见 proposal BREAKING）
- [expo-document-picker/sharing 平台差异] → 仅 Expo 官方包，Android FileProvider 由 expo-sharing 内置处理；导入仅接受 `application/json` 与 .json 后缀

## Migration Plan

无数据迁移（schema 不变、config 字段不变）。发布流程沿用既有惯例：手动同步 app.json versionName/versionCode → `gradlew clean assembleRelease` → ZIP 打包微信交付。回滚即回退 Git 提交重新打包。

## Open Questions

无 —— 单位切换位置、Goal 抽屉仅 3 模板、重置回引导均已与用户诉求对齐并落入 specs。
