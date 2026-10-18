## Why

用户希望 App UI 更现代、更有科技感，已明确选择**深色模式 + 全 app 统一升级**。当前代码里 `darkColors` 预留了一套深色 token 但从未接线（且混有股票 app 残留的 sell/buy/warnBg 等无效键），18 个 UI 文件全部静态 import 浅色 `colors`，app.json 锁死 `userInterfaceStyle: "light"`。深色模式是营养健康类应用科技感最强、欧美用户偏好最高的单项升级（MacroFactor / Cronometer / Rise 均原生支持）。

## What Changes

- **主题运行时体系**：新增 `ThemeProvider` + `useTheme()` hook（跟随系统 / 强制浅色 / 强制深色三态），18 个静态消费 `colors` 的屏幕与组件迁移为 hook 取色；模块级 `StyleSheet.create` 中的颜色引用改为按主题派生
- **darkColors 定稿**：清理股票 app 残留键（sell/buy/warnBg/okBg/triggerBg），补齐与浅色对等缺失的 token（accentSoft / surfaceSoft），色值对齐既定 Dark tokens（背景 #0F172A / 卡片 #1E293B / 文本 #F8FAFC）；macroColors 语义色双主题共用不变
- **主题偏好持久化**：`AppConfig` 新增 `theme_preference`（'system' | 'light' | 'dark'，默认 system，normalizeConfig 兜底）；「我的」页 PREFERENCES 区新增主题选择 SegmentedControl（跟随系统 / 浅色 / 深色，双语）
- **系统层接线**：app.json `userInterfaceStyle` 改 `automatic`；NavigationContainer 注入深/浅两套导航主题；StatusBar barStyle 随主题联动（深色 light-content）；AndroidManifest `uiMode` configChanges 已存在无需改动
- **视觉细节适配**：深色下 Soft Card 微投影降级为 1px `line` 描边（深色阴影不可见）；Toast / 抽屉 / 刻度尺 / 分段控件 / 环形仪表盘全部走 hook 取色；进度达标光晕等微动效在深色下保持可见

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `visual-design-system`：MODIFIED「统一视觉体系」——颜色 token 从单浅色体系升级为双主题体系（ThemeProvider + useTheme 运行时切换，darkColors 定稿并清理残留键）；ADDED「主题偏好」需求（三态偏好、跟随系统、持久化、「我的」页入口）；ADDED「深色模式视觉适配」需求（导航主题、StatusBar、卡片描边降级、全组件 hook 取色、语义色双主题共用）

## Impact

- 代码：`src/theme.ts`（darkColors 定稿 + ThemeProvider/useTheme）、`src/types.ts`（AppConfig + theme_preference）、`configStore.ts`（normalize 兜底）、`App.tsx`（Provider 嵌套 + 导航主题 + StatusBar）、18 个静态取色文件迁移、`app.json`（userInterfaceStyle）、`src/i18n/{en,zh}.ts`（theme.* 新增 key）
- 测试：新增 theme 模块测试（token 对等性、偏好 normalize 兜底、useTheme 解析逻辑）；既有 174 例回归（组件测试若静态断言颜色需同步）
- 无 schema 迁移：AppConfig 走 app_config 主 JSON 的 normalize 兜底路径，旧备份恢复时 theme_preference 缺省回退 system；备份格式 BACKUP_VERSION 不变
- 风险面：18 文件机械迁移量大，但模式统一（静态 import → hook），tsc + vitest + 设备人工验证兜底
