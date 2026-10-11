# App Store Connect 提交核对清单

> 前置：Apple Developer 账号（$99/年）；无 Mac 环境时带 ⏸ 的项挂起。
> App Name 已定稿：**NutriPulse: Calorie & Macros**（28 字符）。

---

## 1. 技术与工程（本地可做）

- [x] `app.json` ios.bundleIdentifier = com.zhongchaojun.mydiet
- [ ] `supportsTablet: false`（改为 false 后 `expo prebuild -p ios` 重新生成工程）
- [ ] PrivacyInfo.xcprivacy：
  - NSPrivacyTracking = false
  - NSPrivacyTrackingDomains = []
  - NSPrivacyCollectedDataTypes = []（声明不收集任何数据）
  - NSPrivacyAccessedAPITypes：UserDefaults → CA92.1（App 自身数据读写理由码）
- [ ] Info.plist：`NSHealthShareUsageDescription`（英文用途文案，见 compliance-checklist.md）；**不声明** NSHealthUpdateUsageDescription（只读不写）
- [ ] Info.plist：`ITSAppUsesNonExemptEncryption = false`（App 仅用 HTTPS 系统能力，无自研加密 → 免法国申报，免出口合规问答）
- [ ] HealthKit capability 开启（Signing & Capabilities）
- [ ] HealthKit 步数读取模块（Expo Modules 自封装）接入 platformSteps.ios.ts
- [x] 医疗免责声明已内置于「我的」页底部（profile.disclaimer）

## 2. 构建与上传（⏸ 需 macOS + Xcode）

- [ ] 最新 Xcode + iOS SDK（App Store 截止日要求，2026-04 起需 Xcode 16.3+/iOS 18.4 SDK）
- [ ] 构建架构 arm64（真机与 App Store 均为 arm64；模拟器另含 x86_64 不影响）
- [ ] `expo prebuild -p ios` → Xcode Archive → 上传 App Store Connect（Transporter 或 Xcode Organizer）
- [ ] iOS 模拟器回归：en/zh 双语、iPhone SE 375×667 与 15/16 Pro Max 430×932、步数同步降级路径
- [ ] 灵动岛/刘海安全区视觉核查（SafeAreaView + insets 已覆盖）

## 3. App Store Connect 资料核对

- [ ] App Name ≤30 字符
- [ ] Subtitle ≤30 字符
- [ ] Keywords ≤100 字符
- [ ] Description 含隐私声明 + 医疗免责声明
- [ ] Privacy Policy URL（GitHub Pages）
- [ ] 支持 URL（可复用隐私政策页或 GitHub repo README）
- [ ] 截图：6.7" 1290×2796 ≥3 张；5.5" 1242×2208 ≥3 张（可选槽位）
- [ ] App 图标 1024×1024 无 alpha

## 4. 隐私问卷（App Privacy）

- [ ] 所有数据类型勾选 **Not Collected**
- [ ] "Does your app track users?" = No（无 ATT 需求）
- [ ] Health 数据：不收集（步数读取仅本地使用，不上传）
- [x] HealthKit 用途字符串已定义且用途诚实一致（审核必查）

## 5. 内容分级与合规

- [ ] 年龄分级问卷：无暴力/赌博/医疗建议 → 预期 **4+**
- [ ] 医疗类目规避：不要声明为医疗 App；功能描述用 "nutrition tracking" 而非 "health management"
- [ ] 审核备注（Review Notes）建议写明：
  > "This app works fully offline. For step sync (optional), open the Steps tab and tap 'Sync from Health' to trigger the HealthKit permission dialog. No account needed to review."

## 6. 提交前终检

- [ ] versionCode/versionName 与 Android 侧一致（1.5.0 / 14）
- [ ] 空状态体验：首启无数据时各页有 EmptyState（不白屏）
- [ ] 删除 App 重装数据清零（本地 SQLite 跟随卸载删除）
- [ ] 无网络环境全功能可用（飞行模式走一遍核心流程）
