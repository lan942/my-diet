# Proposal: overseas-store-launch

## Why

my-diet 目前仅以本地 APK 形式交付（v1.4.6 / versionCode 13，中文 UI，无 iOS 构建，步数为手动录入）。要将这款 100% 本地离线的饮食记录 App 面向海外市场发布到 Google Play 与 Apple App Store，需要一次性补齐两平台的硬性技术指标（AAB 打包、Target API、64 位架构、平台健康接口）、设备适配（小屏到平板/折叠屏、动态字体缩放）、英文本地化、商店静态资源，以及隐私合规材料（Privacy Policy、PrivacyInfo.xcprivacy、Data Safety、医疗免责声明），否则会在提交审核阶段被直接拒绝。

## What Changes

- **发布构建管线**：Google Play 交付物从 APK 改为 Android App Bundle（`gradlew bundleRelease` → .aab）；明确 Target API ≥ 34（按 Expo SDK 57 实际值锁定并记录）；保留 arm64-v8a 并评估补齐 x86_64（模拟器/部分设备）；首次创建 ios/ 目录（`expo prebuild -p ios`）并配置 Xcode 工程以支持 64 位 arm64。
- **平台健康接口接入**：Android 通过 Health Connect（androidx.health.connect，Android 14+ 原生内置、旧版本经 Play Services 兼容）自动读取步数；iOS 通过 HealthKit 读取步数；均保留现有手动录入作为降级路径；iOS 在 Info.plist 配置英文权限说明（NSHealthShareUsageDescription 等）。
- **英文本地化**：引入 i18n 基础设施（轻量 key-value 方案，跟随系统语言，默认英文，保留中文），将现有 23 个源文件中的硬编码中文文案全部迁移为语言包条目；日期/数字格式化按 locale 处理。
- **设备适配加固**：文本容器取消固定高度、支持 allowFontScaling 换行滚动（超大字体不被裁切）；覆盖 iPhone SE 小屏到 Pro Max、iPad（或显式声明不支持 iPad）；Android 18:9~20:9 高宽比、水滴/挖孔屏避让、折叠屏/平板大屏弹性布局（maxWidth 约束、响应式栅格）。
- **隐私合规材料**：英文 Privacy Policy 网页（GitHub Pages 托管，声明不收集不上传任何数据）；iOS 增加 PrivacyInfo.xcprivacy（声明未使用敏感 API）；App Store 隐私问卷全部勾选 Data Not Collected；Google Play Data Safety 勾选 No data collected / No data shared；App 内与商店描述加入医疗免责声明（英文）。
- **商店静态资源**：iOS 1024×1024 无透明图标、Android 512×512 + 自适应前景/背景图标（已有基础）；6.7 寸（1290×2796）与 5.5 寸（1242×2208）英文营销截图各 ≥3 张；Google Play 手机截图 ≥4 张 + 1024×500 Feature Graphic；英文商店文案（App Name ≤30 字符、Short Description ≤80 字符、Full Description 含隐私声明与免责声明）。
- **发布流程准备**：versionCode/versionName 续期规则；Google Play 新个人账号 20 人、14 天封闭测试（Closed Testing）的组织与材料清单；App Store Connect 提交检查单。**不包含**：开发者账号注册本身、深色模式（另行变更）、服务端后端（始终保持纯离线）。

## Capabilities

### New Capabilities

- `localization`: i18n 基础设施与英文语言包；UI 文案全部经语言包输出，跟随系统语言，默认英文；日期与数字按 locale 格式化。
- `device-adaptation`: 动态字体缩放（不裁切、可换行滚动）、小屏（iPhone SE 4.7"）到 Pro Max、Android 高宽比屏与挖孔屏避让、平板/折叠屏大屏弹性布局约束。
- `store-compliance`: 英文隐私政策页、iOS PrivacyInfo.xcprivacy、App Store 隐私问卷与 Google Play Data Safety 应答口径（Data Not Collected）、App 内与商店文案中的医疗免责声明。
- `store-release`: 双平台发布构建（.aab / .ipa）、Target API 与 64 位架构达标、商店图标/截图/Feature Graphic/英文商店文案产出规格、封闭测试与提审流程清单。

### Modified Capabilities

- `step-tracking`: 新增「自动同步平台步数」要求——Android 经 Health Connect、iOS 经 HealthKit 自动读取当日步数写入现有步数记录（覆盖式语义不变）；权限被拒或平台不可用时降级为现有手动录入；新增权限用途文案（英文）要求。

## Impact

- **构建配置**：app.json（version、ios.infoPlist 权限文案、android 权限、adaptiveIcon）、android/app/build.gradle（versionCode/签名/bundle 配置）、新增 ios/ 目录与 PrivacyInfo.xcprivacy。
- **源代码**：全部 5 个 Screen、全部 components（约 8 个）、services 返回的中文提示消息、theme.ts（darkColors 预留不动）；新增 src/i18n/ 目录、平台步数同步模块（src/services/platformSteps.ts 等）。
- **依赖**：新增 i18n 轻量库（如 i18n-js 或自研 hook）+ `react-native-health-connect`（Android）+ HealthKit 桥接库（iOS，如 react-native-health 或 Expo Modules 自封装）；需重新 prebuild 并验证 Hermes 构建。
- **仓库外部**：GitHub Pages 隐私政策页（仓库 gh-pages 分支或独立页）；商店后台资源（不在代码库内，仅产出规格文件与源图 assets/store/）。
- **风险**：Health Connect/HealthKit 涉及敏感权限，是审核重点——权限申请时机（用户主动开启时）与用途文案必须与实际行为一致；iPad 若勾选支持则必须真机/模拟器验证，否则在 Xcode 中显式取消。
