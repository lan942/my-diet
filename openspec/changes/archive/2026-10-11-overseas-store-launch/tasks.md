# Tasks: overseas-store-launch

## 1. i18n 基础设施与错误码重构

- [x] 1.1 创建 src/i18n/ 目录：index.ts（系统 locale 判定 zh*→zh、其余→en）、useLocale hook、t(key, params) 纯函数与 en.json / zh.json 空骨架
- [x] 1.2 services 层错误消息改造：全部中文 Error message 改为错误码常量（ERR_INVALID_AGE、ERR_INVALID_STEPS 等），vitest 断言同步改为错误码
- [x] 1.3 建立语言包 key 清单（按 Screen/组件/错误码分组），typecheck + vitest 全绿

## 2. UI 文案全量迁移

- [x] 2.1 迁移 4 个 Tab 标签与 App.tsx 导航文案
- [x] 2.2 迁移 ProfileScreen（我的）全部文案 + 「我的」页底部加入免责声明条目（语言包 key）
- [x] 2.3 迁移 IntakeScreen（今日）全部文案
- [x] 2.4 迁移 FoodLibraryScreen（食物库）全部文案
- [x] 2.5 迁移 StepScreen（步数）全部文案
- [x] 2.6 迁移 OnboardingScreen 引导向导全部文案（含 TDEE 完成页）
- [x] 2.7 迁移 components（ui.tsx、Card、ProgressBar、DateBar、SegmentedControl、RulerPicker、AnimatedNumber）内的用户可见文案
- [x] 2.8 展示层日期/数字改用 Intl.DateTimeFormat(locale) / toLocaleString 格式化，存储格式不变
- [x] 2.9 双语回归：模拟 zh / en 两种 locale 走通全部页面，无缺 key、无硬编码残留（grep 校验）

## 3. 设备适配加固

- [x] 3.1 排查并消除固定 height 文本容器（grep `height:` 全量核查），改 minHeight + padding
- [x] 3.2 设置全局字体缩放策略：常规 Text 上限 1.4，核心大数字（仪表盘中心/TDEE）上限 2.0
- [x] 3.3 首页环形仪表盘直径按 useWindowDimensions 自适应（iPhone SE 375 宽度基准）
- [x] 3.4 内容区 maxWidth 640 居中约束（四个 Tab 页通用容器），防大屏拉伸
- [x] 3.5 核查顶部/底部全部基于 safe-area insets（无写死距离），挖孔屏/手势条避让确认
- [ ] 3.6 适配回归清单：SE 375×667、20:9 长屏、Android 平板/折叠屏展开宽度、系统最大字体档，逐项真机/模拟器验证

## 4. Android：Health Connect 步数同步

- [x] 4.1 安装并配置 react-native-health-connect（确认支持 RN 0.86 新架构的版本），声明 READ_STEPS 最低权限
- [x] 4.2 实现 src/services/platformSteps.ts：健康接口可用性检测、授权状态、读取当日步数聚合值
- [x] 4.3 stepService 扩展：步数记录增加来源标记（manual/platform），平台同步不覆盖当日 manual 记录
- [x] 4.4 StepScreen 增加「同步步数」入口：先展示用途说明（语言包）→ 运行时请求权限 → 写入；权限拒绝/平台不可用降级路径
- [x] 4.5 vitest：platformSteps 降级逻辑、来源覆盖规则、权限拒绝路径的单测

## 5. Android：发布构建（AAB）

- [x] 5.1 确认/记录 Expo SDK 57 targetSdkVersion ≥ 34（构建日志验证），buildArchs 维持 arm64-v8a
- [x] 5.2 versionCode 14 / versionName 续期，app.json 与 android/app/build.gradle 手动同步
- [x] 5.3 `gradlew bundleRelease` 产出 .aab，校验含 arm64-v8a 原生库（clean 后构建，核对 BUILD SUCCESSFUL）
- [x] 5.4 保留 APK 产出链路用于线下测试（微信 ZIP 交付流程不回归）

## 6. iOS：工程初始化与 HealthKit

- [ ] 6.1 app.json 设置 supportsTablet: false；执行 `expo prebuild -p ios` 生成 ios/ 工程并入库（声明已完成；prebuild 需 macOS，挂起）
- [x] 6.2 Info.plist 配置 NSHealthShareUsageDescription（英文文案，仅读不写）
- [x] 6.3 创建 PrivacyInfo.xcprivacy（UserDefaults CA92.1 理由码、无 Tracking、无 Collected Data）
- [x] 6.4 Expo Modules 自封装 HealthKit 步数读取模块（授权状态 + 当日步数总和），接入 platformSteps 统一接口
- [ ] 6.5 iOS 模拟器回归：en/zh 语言、SE 与 Pro Max 尺寸、步数同步降级路径（依赖 macOS 环境，无 Mac 则标记挂起）

## 7. 合规材料与商店资源

- [x] 7.1 编写 docs/privacy/index.html（英文隐私政策，含两句关键声明），发布 GitHub Pages 并验证可访问（页面已就绪；push 后在 repo Settings 启用 Pages）
- [x] 7.2 创建 store/compliance-checklist.md（App Store 问卷 Data Not Collected 口径 + Play Data Safety No data collected/shared 口径）
- [x] 7.3 创建 store/listing-copy.md（App Name ≤30、Short ≤80、Full Description 含隐私声明与免责声明，敏感词核查）
- [x] 7.4 创建 store/assets-spec.md（图标/截图/Feature Graphic 规格）与 store/closed-testing-plan.md（20 人 14 天闭测计划）
- [x] 7.5 创建 store/appstore-checklist.md（隐私问卷、分级 4+、ITSAppUsesNonExemptEncryption=false、权限与截图核对项）
- [ ] 7.6 产出截图源：iOS 模拟器 6.7"/5.5" 与 Android 模拟器 ≥1080px 各 ≥3/4 张，叠加英文 Headline（assets/store/）（iOS 侧挂起；Android 侧待模拟器截图）
- [x] 7.7 制作 Feature Graphic 1024×500（英文标语）与 Android 自适应图标/512 图标核对（assets/store/）

## 8. 终验

- [x] 8.1 全量 vitest + typecheck + lint 通过；grep 确认无硬编码中文残留（i18n 范围内）与无数据收集依赖
- [x] 8.2 双平台构建产物齐备（.aab versionCode 14 + .ipa 或 iOS 挂起标记），商店材料 5 件套齐备，对照 specs 逐条核对
