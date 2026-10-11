## Purpose
维持「纯本地离线、零数据收集」的商店合规口径：应用内医疗免责声明、英文隐私政策页、iOS 隐私清单与双平台隐私问卷应答沉淀。

## Requirements

### Requirement: 应用内医疗免责声明
应用 SHALL 在「我的」页底部固定展示英文免责声明："Disclaimer: This app is for informational and educational purposes only and is not intended as medical advice. Please consult a healthcare professional before starting any diet or exercise program." 该文案 SHALL 随语言包切换（zh 包提供对应中文翻译）。

#### Scenario: 我的页展示免责声明
- **WHEN** 用户打开「我的」页滚动到底部
- **THEN** 展示完整的英文免责声明文案（英文系统下）

#### Scenario: 免责声明随语言切换
- **WHEN** 系统语言为中文时打开「我的」页
- **THEN** 免责声明展示为语言包中的中文翻译

### Requirement: 英文隐私政策页
项目 SHALL 提供一份公开可访问的英文 Privacy Policy 页面（仓库 `docs/privacy/index.html` 经 GitHub Pages 发布），文案 SHALL 明确声明："We do not collect, store, or transmit any personal health data to external servers." 与 "All calorie, macro, weight, and step data are stored exclusively on your local device."，并 SHALL 覆盖步数数据仅本地使用的说明。商店后台 Privacy Policy URL SHALL 填写该页面地址。

#### Scenario: 隐私政策页面可公开访问
- **WHEN** 在浏览器访问 GitHub Pages 上的 privacy 页面 URL
- **THEN** 返回英文隐私政策页，包含上述两句关键声明

#### Scenario: 隐私政策与实际行为一致
- **WHEN** 审查应用全部代码依赖
- **THEN** 不存在任何网络上传/遥测/崩溃上报 SDK，与隐私政策声明一致

### Requirement: iOS 隐私清单文件
iOS 工程 SHALL 包含 PrivacyInfo.xcprivacy 文件，声明未使用 Tracking Domains、未收集任何数据类型，并声明所用 Required Reason APIs 的理由码（如 UserDefaults CA92.1）。

#### Scenario: 隐私清单随构建打包
- **WHEN** 执行 iOS 构建
- **THEN** 产物 app bundle 内包含 PrivacyInfo.xcprivacy 且声明项完整

### Requirement: 商店合规口径一致性
App Store 隐私问卷 SHALL 全部勾选「Data Not Collected」；Google Play Data Safety SHALL 勾选「No data collected」与「No data shared」。上述口径 SHALL 沉淀为仓库内合规检查单（store/compliance-checklist.md）。代码 SHALL NOT 引入任何分析、广告、崩溃上报第三方 SDK，以维持口径成立。

#### Scenario: 合规检查单沉淀
- **WHEN** 查看仓库 store/compliance-checklist.md
- **THEN** 包含 App Store 问卷与 Google Play Data Safety 的完整应答口径及理由

#### Scenario: 口径与代码一致
- **WHEN** 检查 package.json 依赖清单
- **THEN** 不含 analytics、ads、crashlytics 等任何数据收集类依赖
