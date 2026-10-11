## Context

当前 `App.tsx` 直接渲染四 Tab，`loadConfig()` 在无配置时自动写入 `DEFAULT_CONFIG`（男/30 岁/170 cm/70 kg/1.2，配比 0.45/0.30/0.25），新用户首次打开面对的是一套陌生默认值。「我的」页有 4 个宏量预设、性别仅男/女二选一，`computeBmr` 按性别走 `+5 / −161` 两分支。分层结构：types → db → services → screens → App，全局状态在 `AppContext`。

## Goals / Non-Goals

**Goals:**
- 首次启动以 4 步进度条向导收集：核心目标（3 模板）、身体参数（支持美制单位）、性别（可跳过）、活动强度
- 完成引导后弹窗确认再进入主界面；完成状态持久化，之后不再出现
- 「我的」页保留全部引导项的手动修改能力，预设收敛为 3 个模板
- BMR 公式支持"不选性别"（`−78` 常数，即 +5 与 −161 的中点）

**Non-Goals:**
- 不引入导航库的路由级 onboarding（仍用条件渲染门控）
- 不改食物库/今日/步数三个 Tab 的任何行为
- 不做单位偏好的系统级跟随（仅手动切换）
- 不增加体重历史记录（体重仍为档案字段 `weight_kg`）

## Decisions

### D1：首次启动判定 — `AppConfig.onboarded` 字段而非独立存储
在 `app_config` 的 main JSON 内新增 `onboarded: boolean`。`normalizeConfig` 规则：字段缺失时归一为 `false`。
- 备选：独立 key `onboarding_done`。否——配置本就是单对象 JSON，加字段最少改动，且随 `saveConfig` 原子写入。
- 影响：存量安装（配置无此字段）升级后会看一次向导，默认值已预填、可直接下一步走完，可接受；新安装首次 `loadConfig` 仍写入默认配置，向导完成时以用户输入覆盖并置 `onboarded: true`。

### D2：门控位置 — `App.tsx` 条件渲染
`loading` 时显示加载态；`config && !config.onboarded` 时渲染 `OnboardingScreen`，否则渲染 `RootTabs`。
- 备选：bottom-tabs 内嵌一个引导 Tab。否——引导不应出现在 Tab 栏，条件渲染最简单，且不影响现有 Tab 结构。
- 向导内部步骤用本地 `step` state（1~4），不引入导航器。

### D3：性别三态 — `Gender = 'male' | 'female' | 'unknown'`
- `computeBmr`：`male → base + 5`；`female → base − 161`；`unknown → base − 78`（78 = (5+161)/2，用户给定的常数与中点一致）。
- `validateConfig` 放宽为三值合法；`DEFAULT_CONFIG.gender` 改为 `'unknown'`（隐私优先默认，向导第 3 步默认即"不选"）。
- 「我的」页性别 chips 变为 男 / 女 / 保密 三枚。

### D4：目标模板收敛 — 3 个预设抽到服务层共用
`targetService.ts` 新增导出 `GOAL_PRESETS`（label/desc/carb/protein/fat）：
减脂 `0.30/0.25/0.45`、维持体重 `0.25/0.25/0.50`、增肌 `0.25/0.20/0.55`（蛋白/脂肪/碳水）。
向导第 1 步与「我的」预设区共用该常量，避免两处漂移。`ProfileScreen` 内局部 `PRESETS` 删除。
- `DEFAULT_CONFIG` 配比维持 `0.45/0.30/0.25`（= 减脂模板）不变，避免牵动既有目标数值场景。

### D5：单位切换 — `AppConfig.unit_system` + 纯函数换算
新增 `unit_system: 'metric' | 'us'`（默认 `'metric'`，随配置持久化，向导与「我的」共用）。换算抽为可测纯函数（放 `targetService.ts` 或独立 `src/services/unit.ts`）：
- `cmTo FtIn(cm) → { ft, in }`、`ftInToCm(ft, in)`：1 in = 2.54 cm，身高输入为 英尺 + 英寸两个字段
- `kgToLb(kg)`、`lbToKg(lb)`：1 lb = 0.45359237 kg，显示保留 1 位小数
- 切换单位时双向换算当前值，四舍五入到合理精度；持久化的始终是 cm/kg，单位只影响输入/展示。

### D6：向导交互 — 每步本地草稿，最后一步统一提交
4 步共享一份 `draft` state（goal/age/height/weight/gender/activity），"上一步/下一步"导航；第 1 步必须选目标才能下一步，第 2 步校验年龄 1~120、身高体重为正，第 3 步可跳过（默认 `unknown`），第 4 步默认预选 `1.2`。第 4 步点「完成」→ `saveConfig`（含 `onboarded: true`、所选模板配比）→ 弹出完成弹窗（Bottom Sheet 风格，见 D8）→ 确认后进入主界面。
- 进度条复用现有 `ProgressBar` 组件风格（4 段式，标注「第 N 步 / 共 4 步」）。

### D7：旧配置迁移 — `normalizeConfig` 补新字段
`onboarded` 缺失 → `false`；`unit_system` 缺失或非法 → `'metric'`；`gender` 仅接受三值，非法回退 `'unknown'`（旧数据本就只有男/女，不受影响）。

### D8：UI 视觉规范 — Modern & Premium（已固化至项目记忆，随本 change 落地）
整体风格：低饱和背景 + 高饱和核心数据点缀、卡片化（Soft Cards，微投影 `0 4 12 rgba(0,0,0,0.04)`）、轻量微渐变；对标 MacroFactor / Cronometer / Rise。

- **主题 token（`theme.ts` 扩展）**：
  - Light：bg `#F8F9FA`（极浅暖灰）、card `#FFFFFF`、text `#111827`（柔和近黑）
  - Dark（预留结构）：bg `#0F172A`、card `#1E293B`、text `#F8FAFC`
  - 宏量语义色（全局统一）：热量 `#FF6B4A`、蛋白质 `#6366F1`、脂肪 `#F59E0B`、碳水 `#10B981`、步数 `#06B6D4`
- **向导组件映射**：
  - 第 1 步三张目标卡：软边卡片 + 选中态高亮描边/微渐变，三卡分别绑定语义色——减脂→`#FF6B4A`（燃烧）、维持体重→`#10B981`（均衡）、增肌→`#6366F1`（构建），配比以对应色点展示
  - 第 2 步单位切换：iOS 风格 Segmented Control（带阴影滑块）；年龄/身高/体重优先滚轮/刻度尺选择器（Wheel/Ruler Picker）+ Light Impact 触觉反馈（expo-haptics），避免弹系统键盘；选择器优先自定义实现，如引第三方库需评估 Expo SDK 57 兼容性
  - 完成弹窗：渐变圆角 Bottom Sheet 风格 Modal（支持下拉/按钮关闭），替代系统 Alert，弹窗内数字 Count-Up 展示本次计算出的 TDEE
- **动效与触觉**：步骤切换/目标卡选中加轻过渡；拖动刻度尺、完成确认加 Light Impact 震动；离线应用以本地反馈补足"无网络加载感"
- **Dark Mode 范围控制**：本 change 落地 light/dark 两套 token 常量与浅色实现；全量 Dark Mode 适配（含现有四 Tab 页面）列为后续独立 change，避免本次范围膨胀

## Risks / Trade-offs

- [存量用户升级后被强制看一次向导] → 向导所有步骤预填当前配置值，可直接快速点完；本应用为单用户个人应用，可接受
- [预设收敛导致已用「生酮/低碳」的配比失去高亮] → 自定义比例输入仍保留，配比数据不受影响，仅预设入口减少
- [单位换算浮点误差导致保存值漂移] → 换算后统一 `Math.round` 到展示精度再入库（身高 1 位小数 cm、体重 1 位小数 kg）
- [第 2 步美制输入 ft/in 两字段校验复杂] → 允许 in 为 0~11.9 的有限范围，非法时下一步按钮禁用并提示
- [滚轮/刻度尺选择器为自定义实现，工作量与真机手感不确定] → 先做最简刻度尺（仅年龄/身高/体重三处），工期紧张可回退为数字输入框 + keyboardType，不阻塞主流程
- [expo-haptics 为新增依赖] → Expo 官方内置包，SDK 57 兼容，风险低；震动效果以真机验证为准
