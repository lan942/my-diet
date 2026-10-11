# Google Play Closed Testing Plan（新个人账号硬性要求）

> 背景：2023-11 后注册的 Google Play **个人**开发者账号，首次上架前必须完成
> **至少 20 名测试者、持续 14 天**的封闭测试（closed testing），并回答问卷后才能申请生产权限（production access）。
> 封闭测试通过与否不影响 $25 注册费；未完成 14×20 无法提交正式发布。

---

## 1. 测试基本信息

| 项 | 值 |
| --- | --- |
| Track | Internal → Closed testing（新建 closed track） |
| 包名 | com.zhongchaojun.mydiet |
| 首个 AAB | app-release.aab（versionCode 14+） |
| 测试者招募方式 | Google Group 邮箱列表（推荐，支持 20+ 邮箱） |
| 加入链接 | 控制台 Testing → Closed testing → Testers → Copy link |

## 2. 招募 20 名测试者（可执行路径）

1. 创建 Google Group（如 `nutripulse-testers@googlegroups.com`），设置为"组织可加入/申请加入"
2. 邀请来源（凑满 20 人）：
   - 朋友/家人手机（Android 8+）
   - 社群/朋友圈招募（说明 2 周时长、只需安装试用）
3. 将 20+ 个 Gmail/Google 账号加入 Group（**必须是 Google 账号**才能接受测试邀请）
4. 控制台把 Group 邮箱填入 Testers

## 3. 14 天运行要求（问卷核心）

- 测试者保持 **持续部署的 build 可用**：14 天内不要撤包；发现问题发新 versionCode
- 每天至少数名测试者打开 App（问卷问 "how many users opted in / actively testing"）
- 收集反馈渠道：微信群 / Google Form / 邮箱均可；Play Console 内测反馈也会汇总

## 4. 测试者操作指引（转发给他们）

1. 用手机浏览器打开加入链接 → Join
2. 点击 Play 商店链接 → 安装
3. 首启完成 4 步引导向导（目标 → 身体参数 → 性别 → 活动强度）
4. 至少记录 2 餐饮食 + 1 次步数（手动或健康同步）
5. 使用中如遇崩溃/文案问题，截图反馈

## 5. 14 天后的问卷（Production access application）

控制台 Testing → Closed testing → 提交问卷，要点：
- 说明 App 目标人群（海外个人健康记录用户）与核心功能（离线饮食/步数记录）
- 说明测试规模（20+ 测试者、14 天、覆盖的设备与 Android 版本）
- 说明如何处理了测试反馈（列 2-3 条修复示例，如崩溃/文案/交互问题）
- 数据安全：强调无数据收集（引用 Data Safety 声明与隐私政策 URL）

## 6. 时间线模板

| 天 | 动作 |
| --- | --- |
| D0 | 上传 AAB 至 closed track，发布测试邀请 |
| D1-D14 | 保持包在线；推送修复版本；收集反馈并记录 |
| D14 | 提交问卷申请 production access（审核通常数天内） |
| D14+ | 获批后完善商店资料（截图/文案/定价）→ 提交正式审核 |

## 7. 风险与注意

- 测试者不足 20 或中途大量退出 → 问卷通过率下降，及时补人
- 期间发新版本用**新 versionCode**（不能降级）
- 此阶段 App 在商店不可见，仅测试者可见
