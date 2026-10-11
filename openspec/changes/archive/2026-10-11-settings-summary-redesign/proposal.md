## Why

「我的」页目前是一整页平铺表单（每日目标卡 + 基础信息卡 + 营养配比卡 + 全局「保存全部」按钮），信息密度高：查看一项配置要滚动长页，修改任意一项都要手动定位并统一保存，与首启引导已建立的现代化交互（卡片化、刻度尺、即时反馈）存在明显体验断层。同时「我的」属低频访问页却占据底部 Tab 首位黄金入口。需要将其重构为「结果摘要 + 按需单步编辑」模式，并把该 Tab 移至末位。

## What Changes

- 底部 Tab 顺序调整为「今日 / 食物库 / 步数 / 我的」，初始落地 Tab 为「今日」（核心日记录页）
- 「我的」页整体重构为两个分区，取代现有平铺表单：
  - **PROFILE & TARGETS（设置与目标）**：4 张极简结果摘要卡，每张卡一行编号标题 + 一行摘要文字 + Edit 入口
    1. Goal（目标）：目标模板名 + 当前每日目标 kcal
    2. Body Metrics（身体参数）：年龄 • 身高 • 体重（按单位偏好显示）
    3. Biological Sex（生物学性别）：男 / 女 / 保密
    4. Activity Level（平时锻炼情况）：档位名 (×系数)
  - **PREFERENCES & DATA（偏好与数据）**：单位系统切换（公制/美制 Segmented 内联）、导出数据（JSON 备份 / CSV 记录）、导入恢复、清空/重置全部数据（红色破坏性入口）
- 点击某张摘要卡的 Edit 弹出**单步 Bottom Sheet**（底部抽屉），抽屉内控件直接复用首启引导对应步骤的组件（目标卡 / 刻度尺 RulerPicker / 性别卡 / 强度行）；点击 Save 立即保存并让抽屉下滑消失，摘要文字与首页热量环经全局 config 实时联动刷新，无需统一保存按钮
- 移除平铺表单与「保存全部」统一提交按钮，同时移除自定义宏量配比手动输入（目标抽屉仅保留引导第 1 步的 3 个目标模板）**BREAKING**：页面交互方式全面变更（AppConfig 数据字段与持久化结构不变，无数据迁移）
- 新增数据导出 / 导入 / 清空重置能力（本地文件，无云端）

## Capabilities

### New Capabilities
- `data-management`: 用户数据导出（JSON 全量备份 / CSV 摄入记录导出）、导入恢复（JSON 校验后覆盖恢复）、清空/重置全部数据（破坏性操作需二次确认）

### Modified Capabilities
- `user-profile`: 「我的」合并页结构需求由「目标卡+基础信息卡+营养配比卡平铺」变更为「摘要卡分区 + 偏好数据分区 + 单步抽屉编辑」；四 Tab 顺序与初始 Tab 调整
- `onboarding`: 「引导结果可在我的页修改」的交互变更为单步 Bottom Sheet 复用向导组件，修改即保存生效

## Impact

- **App.tsx**：Tab 注册顺序与 initialRouteName 调整
- **src/screens/ProfileScreen.tsx**：整体重写为摘要卡布局 + 抽屉容器
- **src/screens/OnboardingScreen.tsx**：4 步内联 UI 需抽离为可复用组件（目标卡列表 / 身体参数刻度尺组 / 性别卡列表 / 活动强度行列表），引导页与编辑抽屉共用
- **新增数据服务**（导出/导入/清空）：依赖 expo-file-system、expo-sharing、expo-document-picker（需安装）；新增对应单测
- **i18n**：en/zh 语言包新增摘要卡与数据管理相关 key
- **不受影响**：database schema、targetService 计算逻辑、其余三个 Tab 的功能
