# Spec 合规修复（Spec Compliance Fixes）

> 归档日期：2026-10-11 ｜ 版本：v1.8.2 / versionCode 27 ｜ 类型：缺陷修复（无规格变更）

## Why

对代码库做全量校验（tsc / vitest / expo lint / openspec validate 全过）后，逐条交叉核对主 specs 与实现，发现 4 个确定性问题。本变更将实现拉回与 11 个主 specs 及项目约定完全一致，**不修改任何规格需求**（代码向规格对齐，而非规格向代码妥协）。

## What Changes

1. **food-library「食物名称搜索」违反修复**：`filterFoods` 只匹配 `name`（中文 canonical 字段），英文系统搜 "chick" 无法命中 Chicken Breast（spec 场景明确要求命中）。修复为 `name` 与 `name_en` 双字段大小写不敏感匹配，新增单测覆盖中英文混合匹配。
2. **food-library「食物名与备注动态显示」违反修复**：今日页食物选择器按钮与下拉列表直接渲染 `f.name`（中文），未走 `foodDisplayName()` locale 感知显示（同文件摄入记录列表已正确使用，属重构遗漏）。两处统一改为 `foodDisplayName(f)`。
3. **项目约定违反修复（系统 Alert 清零）**：全项目 17 处 `Alert.alert`（IntakeScreen 4 / StepScreen 8 / ProfileScreen 4 / OnboardingScreen 1）替换为自定义组件体系——校验错误改内联红字（输入即清除）、非阻塞反馈改 Toast（新建共享组件 `src/components/Toast.tsx`，useToast hook + 淡入淡出视图，FoodLibraryScreen 同步重构复用）、编辑抽屉保存错误经 `EditSheet` 新增 `error` 属性内联展示在 Save 上方（抽屉保持打开）。系统 Alert 不响应 `maxFontSizeMultiplier`，违反 device-adaptation 超大字体要求，且脱离应用视觉语言。
4. **文档清理**：FoodLibraryScreen 头部注释移除已废弃的 SUPERFOOD 推荐位描述（v1.7.2 遗留）。

## Impact

- Affected specs：无（全部为代码向既有 specs 对齐）
- Affected code：foodService.ts / IntakeScreen / StepScreen / ProfileScreen / OnboardingScreen / FoodLibraryScreen / EditSheet / 新增 Toast.tsx
- 验证：tsc 零错误、96/96 vitest（95+1 新测试）、expo lint 零警告、openspec validate 11/11、`Alert\.` 全项目 0 命中
