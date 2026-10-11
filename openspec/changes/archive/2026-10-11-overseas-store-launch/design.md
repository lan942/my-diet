# Design: overseas-store-launch

## Context

- 现状：Expo SDK 57 + RN 0.86.3 + TS 6，仅构建过 Android APK（versionCode 13，`buildArchs: ["arm64-v8a"]`，targetSdk 由 Expo 57 预设）；**无 ios/ 目录**（从未 prebuild）；无 i18n，全部 UI 为硬编码中文（5 个 Screen + 8 个组件 + services 返回的中文错误消息）；步数为手动录入（step-tracking spec），未接任何平台健康 API；`userInterfaceStyle: "light"`，theme.ts 中 darkColors 为预留（本变更不动）。
- 纯本地离线是核心卖点：无账号、无网络请求、无分析 SDK——这决定了隐私合规可以走「Data Not Collected」路线，也决定了 Health Connect/HealthKit 数据同样只在本地落库。
- 分层约定不变：types → db → services → screens → App；services 抛业务 Error 子类（错误消息现在也会进入 i18n）。
- 工程事实（来自既往教训）：gradle 构建需华为云镜像缓存；手动维护 android/app/build.gradle 的 versionCode/versionName（勿依赖 prebuild 覆盖）；构建失败后必须 clean 重建；RN style 数组后者静默覆盖前者。

## Goals / Non-Goals

**Goals:**

1. 产出可通过 Google Play 与 App Store 提交门禁的双平台构建：.aab（Target API ≥34，64 位）+ .ipa（Xcode 16+/iOS SDK 最新，arm64）。
2. 步数自动化：Health Connect（Android）/ HealthKit（iOS）读取当日步数，手动录入保留为降级路径。
3. 全量英文本地化：跟随系统语言，默认英文；zh 语言包保留（国内/测试用途）。
4. 动态字体缩放与全尺寸设备适配不破版（含 iPad 决策）。
5. 隐私合规四件套落地：Privacy Policy 页、PrivacyInfo.xcprivacy、App 隐私问卷口径、Data Safety 口径、医疗免责声明（App 内 + 商店文案）。
6. 商店资源规格与源图、英文商店文案、封闭测试与提审清单。

**Non-Goals:**

- 不做深色模式（darkColors 保留，另行变更）。
- 不做服务器、账号体系、云同步、任何遥测。
- 不做除英文以外的第三语言（结构留扩展位，不预先填充）。
- 不注册开发者账号、不实际提交商店（产出全部提交材料为止）。
- 不改营养计算、目标模板、引导向导的业务逻辑（仅文案与布局适配）。

## Decisions

### D1. i18n 方案：自研轻量 hook + JSON 语言包（不引 i18n-js/react-i18next）

- `src/i18n/`：`en.json`、`zh.json` + `index.ts`（`useLocale()` 从 React Native `Localization`/`intl` 取系统语言）+ `t(key, params)` 纯函数。
- 理由：文案量约 200 条、无复数/复杂 ICU 需求；react-i18next 依赖链重（react-i18next + i18next + abstract level），与现有 React Context 架构不匹配。备选 i18n-js 被否：为 200 条 key 引入运行时无收益。
- 语言判定：跟随系统 `RN/nativeModules` locale，`zh*` → zh，其余一律回退 en（默认英文 = 海外主市场）。
- **服务层错误消息**：services 抛出的 Error 只携带错误码（`ERR_INVALID_AGE` 等），由 UI 层用 t() 翻译——否则 services 无法感知 locale。现有中文 Error message 全部改为错误码（vite 测试同步改断言）。
- 日期格式化：展示层用 `Intl.DateTimeFormat(locale)`（Hermes 已支持 Intl）；SQLite 存储仍为本地 `YYYY-MM-DD`（不变）。

### D2. Google Play 构建：`gradlew bundleRelease` 产出 .aab；Target API 由 Expo 57 锁定并显式记录

- Expo SDK 57 预设 targetSdk ≥ 35（>34 要求），设计上无需额外配置，但需在 release 检查单中显式验证 `aapt2 dump badging` 或构建日志。
- 架构：保留 arm64-v8a（覆盖全部真实设备）；**不补 x86_64 进产物**（.aab 按 ABI 拆分下发，x86_64 仅模拟器需要，会被 Play 自动处理，加进去只增大包体）。备选「补齐 x86_64」被否：收益仅限模拟器分发。
- 签名：沿用现有 debug→release 本地 keystore 流程；Play App Signing 可选（上传 key 即可）。
- versionCode 续增（13 → 14…），手动同步 app.json 与 android/app/build.gradle（既往教训）。

### D3. 健康接口：Android 用 `react-native-health-connect`，iOS 用 Expo Modules 自封装 HealthKit

- Android：`react-native-health-connect`（社区标准库，覆盖 androidx.health.connect API）。Android 14+ 系统内置 Health Connect；13 及以下经 Play Services 的 Health Connect APK——库自身抹平，我们不额外处理。
  - 权限：读 `Steps`/`StepSegments`（aggregate 当日总和）；**运行时请求**在用户于步数页主动点击「同步步数」时触发（而非启动即索权）——降低审核摩擦。
- iOS：项目将首次 prebuild 生成 ios/。选 Expo Modules 自封装（Swift `HKQuantityType(.stepCount)` 读取当日 sum）而非 `react-native-health`：后者久未跟 RN 新架构；自封装只需 2 个方法（授权状态 + 读当日步数），成本低。备选 react-native-health 被否：维护活跃度与新架构兼容风险。
- Info.plist：`NSHealthShareUsageDescription = "We use your step count data to automatically estimate your active energy expenditure."`（只读，不写 HealthKit，避免 NSHealthUpdateUsageDescription 扩大审核面）。
- 数据流：平台步数 → `stepService.upsertDay(date, steps)`（复用现有覆盖式语义，来源标记 steps_source：`manual|platform`）；用户手动录入后当日不再被自动覆盖（同会话内以 manual 优先）。
- 降级：权限拒绝/平台不可用/非双平台 → 完全回到手动录入，UI 不显示同步入口或显示引导开启文案。

### D4. iPad：v1 选择「iPhone 兼容（必选）+ 不做原生 iPad 布局」，即 `supportsTablet: false` 隐式声明

- app.json 当前 `supportsTablet: true`。评估后：为 1 个 App 维护 iPad 双栏/分屏布局成本高、收益低（工具类 App iPhone 兼容模式在 iPad 上可正常使用）。
- 决策：`supportsTablet: false`（App Store 不再勾选 iPad 专属尺寸截图义务）；同时 iPhone 适配仍覆盖 iPhone SE 2/3 小屏。
- 备选「完整 iPad 适配」被否：超出单变更预算；若上线后 iPad 流量可观，另行变更。
- 注意：改为 false 后 `expo prebuild -p ios` 生成工程即不含 iPad 目标，需真机清单重新确认。

### D5. 动态字体缩放：全局 `maxFontSizeMultiplier: 1.4` + 布局弹性化

- 不禁用 allowFontScaling（禁用会被欧美审核视为可访问性缺陷）：Text 默认允许缩放，上限 1.4（防止布局崩坏），**关键数据大数字（环形仪表盘中心、TDEE）允许到 2.0**。
- 排查规则（写进 specs 的验收标准）：所有含文本容器不得 `height: 固定值`，改用 minHeight + padding；按钮/卡片高度由内容撑开；列表一律可滚动。
- 小屏（iPhone SE 375×667）：首页环形仪表盘区域用 `useWindowDimensions` 缩放直径；Tab 栏标签允许缩到 11pt。
- Android 高宽比/挖孔：expo `userInterfaceStyle` 不受影响，靠 safe-area-context insets（v1.4.3 已接 SafeAreaProvider）+ 不写死顶部距离；20:9 长屏靠 flex 弹性布局自然覆盖。
- 折叠屏/平板大屏（Android 端仍会被下载）：内容区 `maxWidth: 640` 居中 + `ScrollView`，防止卡片拉伸变形（满足 Play 大屏基本要求：不崩、不裁切、可操作）。

### D6. 隐私合规：GitHub Pages 托管隐私政策 + 仓库内 `store/` 目录沉淀全部上架材料

- Privacy Policy：`docs/privacy/index.html`（纯静态英文页）发布到 gh-pages（本仓库已有 GitHub remote，URL 形如 `https://lan942.github.io/my-diet/privacy/`）；文案声明不收集/不存储/不上传任何数据，数据仅存本机。
- PrivacyInfo.xcprivacy：声明 Required Reason APIs 仅 `UserDefaults`/`FileTimestamp` 类（RN 框架常用项），无 Tracking Domains、无 Collected Data Types。经 prebuild config plugin 放入 ios 工程（或直接放 ios/ 目录入库）。
- 医疗免责声明：App 内「我的」页底部固定一段英文 disclaimer + 商店 Full Description 末尾同文案："This app is for informational and educational purposes only and is not intended as medical advice…"
- 问卷/表单口径沉淀为 `store/compliance-checklist.md`（App Store：Data Not Collected 全勾；Play Data Safety：No data collected / No data shared）——**口径一致性红线**：既然声明不收集，代码不得引入任何分析/崩溃上报 SDK（Crashlytics 等），崩溃靠 Play Console / Xcode Organizer 系统自带报告。

### D7. 商店资源：源图入库 `assets/store/`，规格与文案入库 `store/`

- 截图产出方式：iOS 模拟器（6.7" iPhone 15 Pro Max 1290×2796、5.5" SE 1242×2208）+ Android 模拟器（≥1080px 长边 16:9）跑真实 App 截屏，再叠加英文 Headline（用 Figma/手工，成品不入库，规格入库）。
- 文案（初稿）：
  - App Name（≤30）：`NutriPulse - Offline Macros`（备选 `PurePlate - Offline Calorie`）
  - Short（≤80）：`100% offline calorie & macro tracker. Your data never leaves your phone.`
  - Feature Graphic 1024×500 标语：`100% Offline Calorie & Macro Tracker`
  - Full Description：功能列表 + "All data stays on your device" + Disclaimer（见 D6）。
- 中文商店文案不提供（商店面向海外区）。

### D8. 发布流程：封闭测试材料与提审检查单

- Google Play：新个人账号必须 ≥20 名测试员、连续 ≥14 天 Closed Testing。产出 `store/closed-testing-plan.md`：测试组组织方式（朋友/Reddit/V2EX 招募话术）、AAB 上传轨道（internal → closed → production）、14 天节点记录表。
- App Store：`store/appstore-checklist.md`：Privacy 问卷、NSHealth 权限用途、截图尺寸、年龄分级（4+，无医疗建议——注意分级问卷勿勾 medical reference，勾选仅为健身/营养记录）、export compliance（App 仅本地加密豁免 `ITSAppUsesNonExemptEncryption=false`）。

## Risks / Trade-offs

- **[Health Connect/HealthKit 敏感权限审核]** → 权限仅用户主动点击「同步」时请求；用途文案与行为严格一致；Data Safety 声明「不收集」与「读取本机传感器数据仅本地保存」口径在审核备注中写清楚（读取 ≠ 收集/上传）。
- **[首次 prebuild iOS 工程不可控]** → ios/ 目录入库后不再随意删除重建；gradle 教训同样适用于 xcodebuild：失败后 clean 重建；本地无 Mac 则 iOS 构建暂缓（tasks 中标记为依赖 Mac 环境）。
- **[i18n 改造波及全部 UI 与 vitest 断言]** → 分层策略：services 错误消息改错误码是纯重构、测试断言改错误码一次完成；UI 文案迁移按 Screen 逐个迁移 + 每完成一屏跑一次 typecheck/test。
- **[动态字体导致现有固定尺寸组件破版]** → RulerPicker/SegmentedControl/环形仪表盘是重点回归对象；验收标准含「系统字体调到最大档不裁切」。
- **[supportsTablet: false 与现有 app.json 不一致]** → 在 tasks 中显式列为一步，并在 prebuild 前完成，避免生成 iPad 资源后返工。
- **[Health Connect 依赖包与 RN 0.86 新架构兼容性]** → 选型时锁定已声明新架构支持的版本；若集成受阻，降级方案为 Android 端保持手动录入（步数非核心闭环），仅 iOS HealthKit 上线自动同步。
- **[英文文案质量]** → 商店文案与 UI 首屏文案以母语者/工具双重校对；免责声明与隐私政策为法律性文本，逐句对照模板不自由发挥。

## Migration Plan

1. 基础设施先行：i18n 目录 + 错误码重构（不动 UI）→ 全量 UI 文案迁移（en/zh 双包）。
2. 设备适配加固：固定高度排查、maxWidth、字体缩放上限。
3. Android 侧：Health Connect 集成 → bundleRelease 产出首个 .aab（versionCode 14）。
4. iOS 侧：prebuild（supportsTablet:false）→ Info.plist 权限 → PrivacyInfo.xcprivacy → HealthKit 模块 → 模拟器截图。
5. 材料收尾：隐私政策页发布、store/ 检查单与文案、assets/store/ 源图。
6. 回滚策略：所有改动在单一 feature 分支；i18n 与健康接口互相独立，可分批合并；.aab 构建失败不影响现有 APK 测试线（微信 ZIP 交付流程保持可用）。

## Open Questions

- iOS 构建环境：用户是否有 Mac（或采用云构建/EAS）？无 Mac 时 iOS 侧仅完成代码与配置，签名打包延后。
- App Name 定稿：`NutriPulse` 为占位，需用户确认或提供命名偏好。
- Health Connect 需要的 `READ_HEALTH_DATA` 权限声明是否需要 Play Console 侧健康权限表单（需在实装后按 Console 实际流程确认）。
