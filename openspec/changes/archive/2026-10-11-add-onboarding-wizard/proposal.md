## Why

首次打开应用时用户直接落到四 Tab 主界面，面对一堆默认档案值（男/30 岁/170 cm/70 kg）不知道该做什么、也不理解目标数字从何而来。需要一个引导式 Onboarding 向导：开门见山建立"纯本地离线"信任感，用 4 步进度条收集目标与身体参数，降低理解成本；同时将宏量预设收敛为与核心目标一一对应的 3 个模板。

## What Changes

- 新增首次启动 4 步引导向导（带进度条），仅在未完成引导时展示，完成后进入主界面：
  - 第 1 步：展示「纯本地离线，数据不出设备」卖点；选择核心目标（三选一）：减脂（蛋白 30%: 脂肪 25%: 碳水 45%）、维持体重（蛋白 25%: 脂肪 25%: 碳水 50%）、增肌（蛋白 25%: 脂肪 20%: 碳水 55%）
  - 第 2 步：身体参数录入（身高/体重/年龄），身高体重支持公制（cm/kg）与美国单位（ft+in/lb）切换
  - 第 3 步：性别选择（男/女），支持不选（保密）；不选时 BMR 采用 `(10×体重kg) + (6.25×身高cm) − (5×年龄) − 78`
  - 第 4 步：日常活动强度选择（现有五档）
  - 完成后弹窗提示「设置完成，可以开始记录了」，确认后进入主界面
- **BREAKING** 「我的」页宏量预设从 4 个收敛为 3 个（减脂/维持体重/增肌），移除「高蛋白减脂」「生酮/低碳」
- 性别新增"不选"状态（`unknown`），BMR 公式相应扩展；「我的」页性别选择支持三态
- 配置新增 `onboarded` 标记（首次启动判定）与 `unit_system` 单位偏好（metric/us），随配置持久化
- 「我的」页保留全部引导项的手动修改能力（性别/年龄/身高/体重/活动量/配比/单位切换）

## Capabilities

### New Capabilities
- `onboarding`: 首次启动 4 步引导向导——离线卖点与目标选择、身体参数（含美制单位）、可选性别、活动强度，完成弹窗与主界面进入，完成状态持久化

### Modified Capabilities
- `user-profile`: 性别从必选二值改为三值（男/女/不选），BMR 公式为不选性别增加 `−78` 常数分支；档案录入新增公制/美制单位切换；「我的」页性别选择支持三态
- `weight-target`: 宏量预设模板从 4 个收敛为 3 个（减脂 30:25:45、维持体重 25:25:50、增肌 25:20:55，均为蛋白:脂肪:碳水）

## Impact

- `src/types.ts`：`Gender` 增加 `'unknown'`；`AppConfig` 增加 `onboarded: boolean`、`unit_system: 'metric' | 'us'`
- `src/services/targetService.ts`：`computeBmr` 增加 unknown 分支；目标模板常量（供向导与「我的」共用）
- `src/services/configStore.ts`：`DEFAULT_CONFIG`、`validateConfig`（性别校验放宽）、`normalizeConfig`（新字段归一化，旧配置兼容）
- `App.tsx`：启动门控——未完成引导时渲染向导，完成后渲染四 Tab
- 新增 `src/screens/OnboardingScreen.tsx`（4 步向导 + 进度条 + 完成弹窗）
- `src/screens/ProfileScreen.tsx`：预设收敛为 3 个、性别三态、单位切换、BMR 说明文案更新
- 测试：`tests/targetService.test.ts`、`tests/configStore.test.ts` 补充 unknown 性别与新字段用例
