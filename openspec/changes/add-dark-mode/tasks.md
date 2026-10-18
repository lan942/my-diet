## 1. 主题基础设施

- [x] 1.1 theme.ts：抽 `ThemeColors` 接口；`colors` 原值搬迁为 `lightColors`；按 design D2 定稿 `darkColors`（清理 sell/buy/warnBg/okBg/triggerBg，补齐 accentSoft/surfaceSoft）；新增 `resolveTheme(pref, systemScheme)` 纯函数；保留 `colors` 兼容导出（迁移完成后删除）
- [x] 1.2 新增 ThemeProvider + `useTheme()` hook（useColorScheme 监听系统、configStore 读写偏好、无 Provider 时回退浅色）；`setPreference` 落 AppConfig
- [x] 1.3 types.ts `AppConfig` 增加 `theme_preference: 'system' | 'light' | 'dark'`；configStore DEFAULT_CONFIG + normalizeConfig 兜底（非法值回退 system，与 unit_system 同模式）
- [x] 1.4 app.json `userInterfaceStyle` 改 `"automatic"`

## 2. 全量取色迁移（18 文件）

- [x] 2.1 共享组件迁移：ui / Card / Toast / SegmentedControl / DateBar / RulerPicker / ActionSheet / QuickLogSheet / ProgressBar / EditSheet + onboarding 四组件（GoalPresetCards / BodyMetricsRulers / GenderOptionCards / ActivityLevelRows）——模块级 StyleSheet 中颜色引用改为 `useTheme()` + useMemo 派生
- [x] 2.2 四屏幕迁移：IntakeScreen / FoodLibraryScreen / ProfileScreen / OnboardingScreen
- [x] 2.3 App.tsx：SafeAreaProvider > ThemeProvider > NavigationContainer；导航主题按 isDark 切 DefaultTheme/DarkTheme 并用 ThemeColors 覆盖 background/card/text/border/primary；StatusBar barStyle 联动
- [x] 2.4 卡片深度适配：cardShadow 拆 cardShadowLight + 深色 1px line 描边；Toast/抽屉/进度达标光晕深色可见性检查
- [x] 2.5 删除 theme.ts 的 `colors` 兼容导出；grep 确认无静态 colors 渲染引用残留

## 3. Profile 入口与 i18n

- [x] 3.1 ProfileScreen PREFERENCES 区新增外观行：SegmentedControl 三选（跟随系统/浅色/深色），切换即生效
- [x] 3.2 i18n 新增 theme.title/followSystem/light/dark（中英双语），无硬编码

## 4. 测试与校验

- [x] 4.1 新增 theme 测试：resolveTheme 三态解析、darkColors 与 lightColors 键集对等、normalizeConfig 对 theme_preference 缺省/非法值兜底
- [x] 4.2 新增 i18n 双语 key 集合对齐守卫（既有模式）
- [x] 4.3 `npx tsc --noEmit` / `npx vitest run` / `npx expo lint` / `openspec validate --strict` 全绿
- [ ] 4.4 版本号顺延（app.json + build.gradle），构建 APK 打包 ZIP 交付设备验证（重点：系统深浅切换、强制深色、覆盖安装）
