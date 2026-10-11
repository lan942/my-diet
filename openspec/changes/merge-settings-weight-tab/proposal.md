## Why

当前每日热量目标采用「最新体重 × 固定系数 kcal_per_kg」的粗略估算，完全忽略性别、年龄、身高与活动量，科学性不足；同时「体重」与「设置」分散在两个 Tab，档案、体重、配比操作割裂。改为国际通用的 Mifflin-St Jeor 公式计算 BMR（基础代谢率），乘以活动量系数得到 TDEE（每日总消耗），再按蛋白质/脂肪/碳水配比与换算常数（蛋白 4、碳水 4、脂肪 9 kcal·g⁻¹）拆分每日目标克数，并合并两 Tab 为一页，计算更合理、操作更集中。

## What Changes

- **BREAKING** 底部导航由 5 Tab 调整为 4 Tab：「体重」与「设置」合并为「我的」页，包含每日目标展示、基础信息、体重录入与历史、营养配比四个区块
- **BREAKING** `AppConfig` 字段变更：移除 `kcal_per_kg`、`protein_per_kg`；新增 `gender`（male/female）、`age`、`height_cm`、`activity_factor`；加载旧配置时做归一化迁移（缺省字段补默认值，废弃字段丢弃，比例字段保留）
- 每日目标计算改为：BMR（Mifflin-St Jeor：男 `10×体重kg + 6.25×身高cm − 5×年龄 + 5`，女同式末项 `-161`）→ `TDEE = BMR × 活动量系数` → 按配比拆分 `碳水g = TDEE×碳水比 ÷ 4`、`蛋白g = TDEE×蛋白比 ÷ 4`、`脂肪g = TDEE×脂肪比 ÷ 9`
- 活动量提供 5 档系数：久坐不动 1.2、轻度活动 1.375、中度活动 1.55、高强度活动 1.725、极高强度 1.9
- 营养配比预设模板由 5 个更新为 4 个：减脂均衡（蛋白30%:脂肪25%:碳水45%）、高蛋白减脂（蛋白40%:脂肪20%:碳水40%）、增肌充能（蛋白25%:脂肪20%:碳水55%）、生酮/低碳（蛋白20%:脂肪70%:碳水10%），仍支持手动自定义；默认配比改为减脂均衡 0.45/0.30/0.25（碳水/蛋白/脂肪）
- `TargetResult` 移除冗余的 `daily_protein`（蛋白质目标即 `protein_g`），「今日」页进度条随之取 `protein_g`

## Capabilities

### New Capabilities
- `user-profile`: 用户基础档案能力——性别、年龄、身高、活动量系数的录入、校验与持久化；BMR（Mifflin-St Jeor 公式）与 TDEE（BMR × 活动系数）计算；「我的」合并页结构（目标展示 + 基础信息 + 体重记录 + 营养配比）与底部 Tab 5→4 的导航结构

### Modified Capabilities
- `weight-target`: 每日目标计算基准由「最新体重 × kcal_per_kg 系数」变更为「TDEE = BMR × 活动系数」（BMR 依赖最新体重与用户档案）；配置字段增删（移除两个系数、新增档案字段）；宏量拆分换算常数 4/4/9 不变但热量来源变更；预设模板由 5 个变更为 4 个；体重录入/历史展示位置并入「我的」页；`TargetResult` 移除 `daily_protein`

## Impact

- `App.tsx`：Tab 参数类型与 Screen 注册 5→4，「我的」Tab 图标
- `src/screens/`：新建 `ProfileScreen.tsx`（合并页），删除 `WeightScreen.tsx`、`SettingsScreen.tsx`；`IntakeScreen.tsx` 改用 `target.protein_g`
- `src/services/targetService.ts`：新增 `computeBmr`/`computeTdee`，重写 `computeTarget`
- `src/services/configStore.ts`：`DEFAULT_CONFIG` 更新、`validateConfig` 增加档案字段校验、`loadConfig` 旧配置归一化迁移
- `src/types.ts`：`AppConfig`、`TargetResult` 类型变更
- `src/state/AppContext.tsx`：无结构变化，随 `AppConfig` 类型联动
- `tests/targetService.test.ts`、`tests/configStore.test.ts`：按新公式与字段重写用例
- `app.json`：版本号升级（versionName/versionCode），交付 APK 需打包 ZIP 经微信传输
