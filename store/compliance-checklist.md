# Compliance Checklist — Store Privacy Declarations

> 口径基准：NutriPulse 100% 离线，无账号、无服务器、无分析、无广告、无追踪；
> 唯一可选权限为读取步数（Health Connect / HealthKit），数据仅本地使用。
> App Name 已定稿：**NutriPulse: Calorie & Macros**（28 字符，两平台统一）。

---

## Google Play Console — Data Safety（数据安全表单）

按以下口径逐项回答（控制台路径：Policy → App content → Data safety）：

| 问题 | 回答 |
| --- | --- |
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | 不适用（无数据收集；表单选 No 后此项不出现） |
| Do you provide a way for users to request that their data is deleted? | 不适用（无数据离开设备；卸载即删除） |

**注意事项**
- 声明必须与 Privacy Policy URL 一致（docs/privacy/index.html，GitHub Pages）。
- 步数读取发生在用户设备本地、结果仅写本地数据库 → 不构成 "collection"（无离开设备）。
- 若后续版本引入任何网络能力（云备份/统计），必须重新填写 Data Safety 并更新隐私政策。

## App Store Connect — App Privacy（隐私问卷）

路径：App Store Connect → App → Privacy。逐类声明 **Data Not Collected**：

| 数据类型 | 声明 |
| --- | --- |
| Contact Info / Identifiers / Location / Health & Fitness / Usage Data / Diagnostics | **Not Collected**（全部不勾选） |

**App Tracking Transparency**：不使用 → 无需 ATT 弹窗，隐私问卷 "Does your app track users?" = **No**。

## 共同要求（两平台）

- [ ] Privacy Policy URL 可公开访问（GitHub Pages 发布后用无痕浏览器验证）
- [ ] 政策页包含两句关键声明（纯本地存储 / 无数据收集）——已写入 docs/privacy/index.html
- [ ] 医疗免责声明已出现在：App 描述 + App 内「我的」页底部（profile.disclaimer）+ 隐私政策第 6 节
- [ ] 描述与宣传文案中禁止出现医疗功效词：cure / treat / diagnose / prevent / therapy / medical advice
- [ ] 权限使用说明：Health 权限用途文案（见下）已配置于两个平台
- [ ] 步数同步为可选功能，权限由用户主动触发（代码内已实现：StepScreen handleSync）

## Health 权限用途文案（两平台统一口径）

- Android：`android.permission.health.READ_STEPS`（仅读，无写权限声明）
- iOS：`NSHealthShareUsageDescription`：
  > "NutriPulse reads today's step count from Apple Health to estimate your daily activity energy. Data is used on-device only and is never uploaded or shared."
- Play Console Health apps 声明：用途类别 = Fitness，数据类型 = Steps，只读，无分享
