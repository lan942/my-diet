## Context

当前 18 个 UI 文件（4 屏幕 + 14 组件）全部 `import { colors } from '../theme'` 静态取浅色 token；theme.ts 中 `darkColors` 预留但含股票 app 残留键（sell/buy/warnBg/okBg/triggerBg）且缺 accentSoft/surfaceSoft 对等项；app.json `userInterfaceStyle: "light"`；App.tsx NavigationContainer 写死 DefaultTheme。无 ThemeContext，无运行时切换能力。

## Goals / Non-Goals

**Goals:**

- 双主题运行时：ThemeProvider + `useTheme()` hook，三态偏好（system 默认 / light / dark）持久化于 AppConfig
- darkColors 定稿：清理残留键、补齐 token 对等、对齐既定 Dark tokens
- 全 app 覆盖：4 屏幕 + 全部共享组件 + 导航 + StatusBar + 抽屉/Toast
- 浅色视觉零回归：light token 值与现有渲染 1:1 保持

**Non-Goals:**

- 不改 light 色值、不改 spacing/radius/typeScale、不引入新组件库
- 不做玻璃拟态/光效/动效增强（用户在方向选择中未勾选，后续单独变更）
- iOS 深色真机验证（需 macOS，沿用既有挂起项）

## Decisions

### D1：主题运行时 = Context + hook，禁止静态 colors 渲染引用

`src/theme.ts` 改造：

```ts
export interface ThemeColors { bg; card; line; text; muted; accent; accentSoft; surfaceSoft; ok; warn; danger; }
export const lightColors: ThemeColors = { /* 现有 colors 值原样搬迁，键名不变 */ };
export const darkColors: ThemeColors = { /* 定稿值见 D2 */ };
// 兼容导出：export const colors = lightColors（迁移期防漏，最终实现完成后删除）
export function resolveTheme(pref, systemScheme): ThemeColors
```

新增 `src/theme/ThemeContext.tsx`（或 theme.tsx 同文件）：`ThemeProvider` 内部 `useColorScheme()` 监听系统 + 从 configStore 读偏好 + `setThemePreference()` 写回；`useTheme()` 返回 `{ colors: ThemeColors, isDark: boolean, preference, setPreference }`。

**迁移模式（18 文件统一）**：模块级 `StyleSheet.create({...colors.x})` → 组件内 `const { colors: c } = useTheme(); const styles = useMemo(() => makeStyles(c), [c]);`，或样式中颜色字段改行内。`macroColors` 语义色保持静态 import 不变（双主题共用）。

备选方案：CSS 变量式 theme object 引用替换（RN 不支持）；react-native-appearance 第三方库（自研 Context 足够，零新依赖，与自研 i18n 同哲学）。

### D2：darkColors 定稿

| token | dark 值 | 说明 |
|---|---|---|
| bg | #0F172A | Slate 900 |
| card | #1E293B | Slate 800 |
| line | #334155 | Slate 700 |
| text | #F8FAFC | Slate 50 |
| muted | #94A3B8 | Slate 400 |
| accent | #818CF8 | Indigo 400（深色下 #6366F1 对深背景对比度不足，提亮一档） |
| accentSoft | #312E81 | Indigo 900 作深色 tint 底 |
| surfaceSoft | #0B1220 | 比 bg 再深半档的内嵌面 |
| ok | #34D399 | Emerald 400 |
| warn | #FBBF24 | Amber 400 |
| danger | #F87171 | Red 400 |

删除 sell/buy/warnBg/okBg/triggerBg 残留键（浅色体系无对等键，深色不留孤儿）。`cardShadow` 拆分为 `cardShadowLight`（现值）与深色下不使用阴影、改 `borderWidth: 1, borderColor: line`。

### D3：偏好持久化走 AppConfig normalize 兜底

`AppConfig.theme_preference: 'system' | 'light' | 'dark'`，DEFAULT_CONFIG 给 'system'，normalizeConfig 非法值回退 system（与 unit_system 同模式）。BACKUP_VERSION 不变——旧备份缺字段 normalize 兜底，新备份带字段旧版本 normalize 忽略多余键，双向兼容。

### D4：系统层接线

- app.json `userInterfaceStyle: "automatic"`（让 useColorScheme 真实反映系统）
- App.tsx：`SafeAreaProvider > ThemeProvider > NavigationContainer`；导航主题按 isDark 选 `DarkTheme`/`DefaultTheme` spread 覆盖 colors（background/card/text/border/primary 全部来自 ThemeColors）
- StatusBar：`barStyle = isDark ? 'light-content' : 'dark-content'`（React Native 内置 StatusBar 即可，Android 背景色同步设 bg）
- AndroidManifest `uiMode` 已在 configChanges（已核实），切换不重启 Activity

### D5：Profile 入口

PREFERENCES 区新增「外观 / Appearance」行，复用既有 SegmentedControl（三选：跟随系统/浅色/深色），i18n key `theme.title/followSystem/light/dark`（中英双语）。切换即 setPreference → Provider 重渲染，全树生效。

## Risks / Trade-offs

- [18 文件机械迁移漏改静态引用] → 迁移完成后在 theme.ts 删除 `colors` 兼容导出，tsc 会立刻暴露所有残留引用；再加一条 grep 校验进 tasks
- [深色下语义色对比度] → macroColors 五色在 #1E293B 上均 ≥3:1（图形/进度条用途达标）；文本一律走 text/muted token 不直接用语义色
- [hook 迁移导致样式重算性能] → useMemo 按 theme 对象缓存 styles；18 文件均为低频重渲染页面，无 FlatList 大列表样式热路径
- [onboarding 首启深色] → ThemeProvider 包在 SafeAreaProvider 下、NavigationContainer 上，引导页同样走 hook，无特例
- [测试环境无 Provider] → useTheme 在无 Provider 时回退浅色（resolveTheme('system', 'light')），既有组件测试零改动

## Migration Plan

无数据迁移。随常规版本发布（versionCode +1）。回滚 = revert；theme_preference 残留在 config JSON 中无害（normalize 兜底）。

## Open Questions

无。accent 深色值提亮一档（#6366F1→#818CF8）是唯一偏离"token 原样"的决定，理由：#6366F1 在 #0F172A 背景上对比度 3.4:1 低于按钮文本 4.5:1 要求；如用户希望深色 accent 与浅色严格一致，实施时一行可改回。
