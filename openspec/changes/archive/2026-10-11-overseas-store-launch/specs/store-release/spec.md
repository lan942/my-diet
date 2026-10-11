# store-release 变更规格

## ADDED Requirements

### Requirement: Android App Bundle 构建
系统 SHALL 支持 `gradlew bundleRelease` 产出 .aab 交付物用于 Google Play（APK 仍保留用于线下测试）；.aab SHALL 满足 Target API ≥ 34（以 Expo SDK 57 实际预设为准并记录验证结果）且包含 64 位 arm64-v8a 原生库；versionCode SHALL 相对当前（13）续增并在 app.json 与 android/app/build.gradle 中保持同步。

#### Scenario: 产出合规 AAB
- **WHEN** 执行 release bundle 构建
- **THEN** 产出 .aab 文件，检查其包含 arm64-v8a 原生库且 targetSdkVersion ≥ 34

#### Scenario: 版本号同步
- **WHEN** 提升 app.json 中的 versionCode
- **THEN** android/app/build.gradle 中 versionCode 与其一致（手动同步步骤后验证）

### Requirement: iOS 构建工程与权限配置
系统 SHALL 生成并维护 ios/ 工程（首次 `expo prebuild -p ios`，supportsTablet: false），配置英文 HealthKit 权限说明 `NSHealthShareUsageDescription = "We use your step count data to automatically estimate your active energy expenditure."`（仅读不写，不声明 NSHealthUpdateUsageDescription），以 arm64 64 位架构与最新 iOS SDK 构建 .ipa。

#### Scenario: Info.plist 权限文案
- **WHEN** 检查 iOS 工程的 Info.plist
- **THEN** 包含 NSHealthShareUsageDescription 且文案与规范一致，不包含写权限声明

#### Scenario: iOS 构建产物
- **WHEN** 在具备 macOS/Xcode 16+ 环境下执行 iOS 构建
- **THEN** 产出 arm64 架构 .ipa，iPhone 真机安装可正常启动

### Requirement: 商店静态资源规格
仓库 SHALL 沉淀商店静态资源与规格：iOS 图标 1024×1024（PNG 无透明）、Android 图标 512×512 与自适应前景/背景层；App Store 截图 6.7 寸（1290×2796）与 5.5 寸（1242×2208）各 ≥3 张、Google Play 手机截图（长边 ≥1080px，16:9 或 9:16）≥4 张、Google Play Feature Graphic 1024×500；截图 SHALL 叠加英文营销 Headline。源图入库 assets/store/，规格说明入库 store/assets-spec.md。

#### Scenario: 截图规格齐备
- **WHEN** 对照 store/assets-spec.md 检查产出截图
- **THEN** 双平台截图尺寸、数量、Headline 均符合规格

#### Scenario: Feature Graphic 规格
- **WHEN** 检查 Google Play 宣传图
- **THEN** 尺寸为 1024×500 且包含英文标语 "100% Offline Calorie & Macro Tracker"（或同等标语）

### Requirement: 英文商店文案
仓库 SHALL 沉淀英文商店文案（store/listing-copy.md）：App Name ≤30 字符（如 "NutriPulse - Offline Macros"）、Short Description ≤80 字符（含纯离线卖点）、Full Description（功能特点 + 数据仅存本机声明 + 医疗免责声明）。Full Description SHALL NOT 出现 "cure diabetes"、"treat obesity"、"medical advice" 类医疗承诺词汇，末尾 SHALL 包含 D6 规定的免责声明全文。

#### Scenario: 文案字符数达标
- **WHEN** 校验商店文案
- **THEN** App Name ≤30 字符、Short Description ≤80 字符

#### Scenario: 文案含免责且无敏感词
- **WHEN** 校验 Full Description
- **THEN** 包含数据仅存本机声明与医疗免责声明全文，且不含医疗承诺类敏感词

### Requirement: 发布流程材料
仓库 SHALL 沉淀发布流程材料：Google Play 封闭测试计划（store/closed-testing-plan.md，含 ≥20 名测试员、连续 ≥14 天的组织与记录方式、internal→closed→production 轨道说明）与 App Store 提审检查单（store/appstore-checklist.md，含隐私问卷、年龄分级 4+、ITSAppUsesNonExemptEncryption=false、截图与权限核对项）。

#### Scenario: 封闭测试计划齐备
- **WHEN** 查看 store/closed-testing-plan.md
- **THEN** 包含测试员招募方式、14 天时间线与轨道升级路径

#### Scenario: 提审检查单齐备
- **WHEN** 对照 store/appstore-checklist.md 逐项核对
- **THEN** 每项均有完成状态与对应材料/配置的引用
