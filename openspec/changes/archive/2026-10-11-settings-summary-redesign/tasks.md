## 1. 依赖与基础

- [x] 1.1 安装 expo-file-system、expo-sharing、expo-document-picker（`npx expo install`）
- [x] 1.2 en.ts / zh.ts 新增 `settings.*` 语言包 key（分区标题、4 张摘要卡标题与 Edit、4 个抽屉标题/说明/保存、导出/导入/清空各项与确认弹窗文案）

## 2. 引导组件抽离（D1）

- [x] 2.1 新建 src/components/onboarding/GoalPresetCards.tsx：受控组件（value/onChange），迁移 goalCard 样式、选中态与触觉反馈
- [x] 2.2 新建 src/components/onboarding/BodyMetricsRulers.tsx：受控组件（age/heightCm/weightKg/unit + onChange），内含单位 Segmented 与 3 个 RulerPicker，公/美制换算逻辑内聚
- [x] 2.3 新建 src/components/onboarding/GenderOptionCards.tsx：受控组件，迁移性别卡样式与 GENDER_OPTIONS 常量
- [x] 2.4 新建 src/components/onboarding/ActivityLevelRows.tsx：受控组件，迁移强度行样式、五点强度计与 LEVEL_COLORS 常量
- [x] 2.5 改造 OnboardingScreen：4 步渲染替换为上述组件调用，状态机/导航/完成弹窗不变，人工回归 4 步引导全流程

## 3. 编辑抽屉与「我的」页重构（D2/D3/D4）

- [x] 3.1 新建 src/components/EditSheet.tsx：单步底部抽屉容器（grabber + 标题 + 说明 + 内容 ScrollView + Save 按钮 + 遮罩关闭 + 手势下拉关闭 + insets 底边距），视觉按 D10 渐变圆角 Bottom Sheet
- [x] 3.2 重写 ProfileScreen：PROFILE & TARGETS 分区 4 张摘要卡（Goal 摘要含 preset 匹配容差与 P/F/C 兜底显示 + computeTarget 目标 kcal；Body Metrics 按单位偏好显示；Biological Sex；Activity Level ×系数），每卡编号 + 摘要行 + Edit，Soft Card 风格 + 4px 语义色条（橙/靛蓝/琥珀/翡翠绿 1:1 映射，见 D10）+ 点 Edit 触觉
- [x] 3.3 ProfileScreen PREFERENCES & DATA 分区：eyebrow 分区标题样式；单位 Segmented（iOS 风格阴影滑块）即存即生效；导出/导入行；红色清空重置行（本任务先接占位 handler，4.x 补实现）
- [x] 3.4 接入 4 个编辑抽屉：Goal/Body Metrics/Gender/Activity 各自草稿 state + Save 调 saveAndRefreshConfig，成功关抽屉+Success 触觉，失败 Alert 且抽屉保留；校验失败场景覆盖年龄/体重非法
- [x] 3.5 验证摘要与首页热量环实时联动（保存后无需手动刷新），Goal 摘要 kcal 变化走 AnimatedNumber Count-Up

## 4. 数据管理服务（D5/D6/D7）

- [x] 4.1 新建 src/services/dataService.ts：buildBackup / parseBackup（version===1 与结构校验，非法抛 BizError）/ buildIntakeCsv（含转义）
- [x] 4.2 新增 vitest 单测：backup 往返（build→parse 一致）、非法 JSON/版本不兼容拒绝、CSV 转义与空记录表头
- [x] 4.3 db 层新增 restoreBackup（单事务覆盖写入，失败回滚）与 resetAllData（清空全部表 + config 默认 onboarded=false）
- [x] 4.4 dataService 文件 IO：导出写 cache 临时文件 + expo-sharing 分享；导入 expo-document-picker 选 JSON → parseBackup → restoreBackup → refresh
- [x] 4.5 ProfileScreen 接通导出/导入/清空：清空走 Alert destructive 二次确认，确认后 resetAllData + 重新种子初始化，Root 自动回到首启引导

## 5. Tab 重排（D8）

- [x] 5.1 App.tsx：Tab.Screen 顺序改为 Today / Food / Steps / Profile，initialRouteName="Today"

## 6. 质量与构建

- [x] 6.1 全量 vitest 通过（新增用例 + 既有 55 个不回归）；`npx expo lint` 无新错误
- [x] 6.2 i18n 检查：新 UI 无硬编码文案，en/zh 全覆盖，Text 均带 maxFontSizeMultiplier，页面 maxWidth 居中约束；风格检查：色值全部经 theme.ts tokens（macroColors/cardShadow），无硬编码色值，darkColors 保留集不动
- [x] 6.3 版本号 bump（app.json versionName/versionCode），手动同步 android/app/build.gradle
- [x] 6.4 `gradlew clean assembleRelease` 构建成功，ZIP 打包交付微信测试（核对 BUILD SUCCESSFUL 而非退出码）
