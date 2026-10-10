## Why

个人饮食/营养记录目前没有统一入口：体重、每日热量/蛋白质目标、优质食物参考、每日摄入与步数分散在不同地方，难以一眼掌握「今天吃够了没、动够了没」。需要一个本地化、离线可用、复用 my-fin-app 架构风格的饮食记录 app，把这几件事聚合到 5 个底部 Tab 里。

## What Changes

- 新建整个 React Native (Expo) 工程，复用 my-fin-app 的分层（types → db → services → screens → App）与浅色主题风格。
- 新增体重记录：录入体重，自动算出每日热量与蛋白质目标（按可配置比例分配到碳水/蛋白质/脂肪三大宏量）。
- 新增优质食物库：内置碳水（标注低 GI）、蛋白质、脂肪、抗氧化蔬菜、膳食纤维等分类与示例食物，支持增删改。
- 新增每日营养摄入记录：按天记录吃了什么、多少量，汇总当天热量/蛋白质/碳水/脂肪摄入，并与目标对比。
- 新增每日步数记录：按天录入步数，展示与热量消耗的对照。
- 本地 SQLite 持久化（expo-sqlite，WAL，幂等建表），React Context 全局状态，vitest 单测。

## Capabilities

### New Capabilities
- `weight-target`: 体重记录与每日热量/蛋白质目标计算。录入体重后，按可配置比例算出热量（如每公斤 30 kcal）与蛋白质（如每公斤 1.5 g）目标，并拆分三大宏量配比。
- `food-library`: 优质食物分类与食物条目管理。内置碳水（含低 GI 标注）、蛋白质、脂肪、抗氧化蔬菜、膳食纤维等分类，支持增删改食物条目及其营养参数。
- `daily-intake`: 每日营养摄入记录与统计。按天记录食物摄入量，汇总当天热量/蛋白质/碳水/脂肪，并与当日目标对比展示达成率。
- `step-tracking`: 每日步数记录与展示。按天录入步数，估算消耗热量并展示。

### Modified Capabilities
<!-- 无既有 spec，全部为新建 -->

## Impact

- 全新工程代码：`src/types.ts`、`src/db/{schema,database}.ts`、`src/services/*`、`src/screens/*`、`src/state/AppContext.tsx`、`src/theme.ts`、`App.tsx`、`index.ts`、`package.json`、`tsconfig.json`、`app.json`、`vitest.config.mts` 等。
- 数据库新增表：体重记录、食物库分类与条目、每日摄入记录、每日步数、应用配置。
- 依赖与 my-fin-app 对齐：expo-sqlite、@react-navigation/bottom-tabs、react-native-safe-area-context、vitest 等。
- 仅本地存储，无后端、无联网权限。
- APK 通过微信传文件传输到手机测试；本地 Git 仓库版本管理。
