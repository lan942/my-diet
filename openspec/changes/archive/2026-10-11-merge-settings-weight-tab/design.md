## Context

当前应用为 5 底部 Tab（体重/食物库/今日/步数/设置）。热量目标计算在 [targetService.ts](file:///d:/my-diet/src/services/targetService.ts) 中采用「最新体重 × kcal_per_kg 系数」，蛋白质目标为「最新体重 × protein_per_kg」，宏量按 carb_ratio/protein_ratio/fat_ratio 与 4/4/9 kcal·g⁻¹ 拆分。配置以 JSON blob 存于 SQLite `app_config` 表（key='main'），无独立档案数据。体重录入与历史在 `WeightScreen`，系数与配比在 `SettingsScreen`，两页数据相互依赖（体重页展示目标、设置页调比例）但分散两处。

分层约定：types → db → services → screens → App；服务层抛业务 Error 子类；vitest 单测已覆盖 targetService 与 configStore。

## Goals / Non-Goals

**Goals:**
- 用 Mifflin-St Jeor 公式（性别 + 最新体重 + 身高 + 年龄）计算 BMR，乘 5 档活动量系数得到 TDEE，替代体重×系数法
- 按 TDEE 与配比、4/4/9 换算常数输出每日碳水/蛋白/脂肪克数目标
- 「体重」与「设置」两 Tab 合并为「我的」页，页面内含目标展示、基础信息、体重记录、营养配比四个区块
- 4 个新预设模板 + 自定义配比；旧配置（v1.2.0 APK）升级后自动归一化迁移
- 单测同步更新，目标计算保持纯函数可测

**Non-Goals:**
- 不引入体脂率/腰围等更精确的体成分修正（界面保留「估算」标注即可）
- 不做云同步、不做多用户档案
- 不改动食物库、今日摄入、步数三个 Tab 的功能逻辑（仅「今日」页蛋白质目标取数字段随类型调整）

## Decisions

### D1. 目标计算保持纯函数，新增 computeBmr/computeTdee
`targetService.ts` 新增并导出：
- `computeBmr(gender, weightKg, heightCm, age)`：男 `10w + 6.25h − 5age + 5`，女同式末项 `-161`
- `computeTdee(bmr, activityFactor)`：`bmr × activityFactor`
- `computeTarget(latestWeight, cfg)` 签名不变（入参仍是最新体重记录 + AppConfig），内部改为 `TDEE → 按配比 ÷ 4/4/9` 拆分；`TargetResult` 移除 `daily_protein`（蛋白质目标即 `protein_g`）

理由：与现有 `computeTarget` 纯函数风格一致，vitest 无需 mock DB 即可测公式；备选方案（把 BMR 计算放进 configStore 或屏幕组件）会让校验与展示耦合，弃用。

### D2. 活动量存系数数值，配 UI 常量表
`AppConfig.activity_factor: number` 直接存 1.2/1.375/1.55/1.725/1.9 之一；`targetService.ts` 导出 `ACTIVITY_LEVELS = [{factor, label, desc}]`（久坐不动 1.2 / 轻度活动 1.375 / 中度活动 1.55 / 高强度活动 1.725 / 极高强度 1.9），供 UI 渲染选项与 `validateConfig` 白名单校验共用。

理由：计算直接消费系数本身，存数值省一层映射；备选方案（存 key 字符串如 'moderate'）语义更明确但需要双向映射表，对单用户本地应用收益不足，弃用。

### D3. 配置迁移用「归一化合并」而非 schema 变更
配置仍是 `app_config` 表 JSON blob，DDL 不动。`loadConfig` 读取后按新 `AppConfig` 形状归一化：
- 新档案字段缺失时补 `DEFAULT_CONFIG` 默认值（male / 30 岁 / 170cm / 1.2）
- 废弃字段（kcal_per_kg、protein_per_kg）读取时丢弃，下次保存自然覆盖
- carb/protein/fat_ratio 兼容保留（旧值和为 1 依然合法）

理由：v1.2.0 用户升级安装后首次启动即完成迁移，无需一次性数据脚本；备选方案（新开配置 key='main_v2'）会让回滚复杂化，弃用。

### D4. 导航 5→4，新建 ProfileScreen 承载合并页
`App.tsx` 的 `RootTabParamList` 调整为「我的 / 食物库 / 今日 / 步数」，新建 `src/screens/ProfileScreen.tsx`，区块自上而下：每日目标卡（TDEE kcal + 三大宏量 g）→ 基础信息卡（性别切换、年龄、身高、活动量五选一）→ 体重录入卡 → 体重历史卡（复用现有 Row/删除交互）→ 营养配比卡（4 预设 chip + 三个手动输入框）→ 保存按钮。删除 `WeightScreen.tsx`、`SettingsScreen.tsx`。

理由：四个区块共享 config 与 weights 状态，单屏ScrollView一次滚动即可完成全部编辑；备选方案（Tab 内再嵌套子导航）层级过深且与既有样式风格不符，弃用。预设点击行为保持现状：立即保存并全局刷新联动；基础信息与自定义配比走「保存」按钮统一提交校验。

### D5. 预设模板与默认配比更新
预设常量更新为 4 个：减脂均衡 P30/F25/C45、高蛋白减脂 P40/F20/C40、增肌充能 P25/F20/C55、生酮/低碳 P20/F70/C10；`DEFAULT_CONFIG` 配比改为 0.45/0.30/0.25（碳水/蛋白/脂肪，即减脂均衡）。

### D6. 版本随变更升级
`app.json` versionName → 1.3.0、versionCode 递增，按项目惯例打包 ZIP 经微信传输真机验证。

## Risks / Trade-offs

- [旧配置 JSON 含废弃字段与缺失档案字段] → `loadConfig` 归一化兜底 + `validateConfig` 严格校验，任一字段非法即抛 `ConfigError` 并回退默认
- [Mifflin-St Jeor 对肌肉量异常人群偏差较大] → 界面保留「估算」文案与公式说明；后续如需精确可加体脂率修正（本版 Non-Goal）
- [TDEE 随体重记录实时变化，用户感知目标「自己会动」] → 目标卡标注「基于最新体重与档案估算」，公式注释随卡展示
- [`daily_protein` 移除导致「今日」页编译报错] → 同一 change 内同步将 `IntakeScreen` 进度条目标改为 `target.protein_g`
- [合并页内容变长] → 全部区块为轻量表单/列表，ScrollView 滚动可接受；预设 chip 横向滚动保持紧凑

## Migration Plan

1. 类型与配置层先行（types → configStore 归一化 + 校验），旧配置首次加载即迁移
2. targetService 公式替换 + 单测重写（先红后绿）
3. 新建 ProfileScreen、删两旧屏、App.tsx Tab 调整、IntakeScreen 字段替换
4. vitest 全绿后构建 v1.3.0 APK 打包 ZIP 微信真机验证
5. 回滚策略：纯本地应用无数据迁移脚本，git revert 回退即可；旧 APK 数据（体重/摄入/步数记录）不受本变更影响

## Open Questions

无（活动量档位、预设比例、默认配比均已在需求中明确）。
