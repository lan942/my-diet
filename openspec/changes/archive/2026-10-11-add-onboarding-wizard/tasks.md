## 1. 类型与服务层

- [x] 1.1 `src/types.ts`：`Gender` 增加 `'unknown'`；`AppConfig` 增加 `onboarded: boolean` 与 `unit_system: 'metric' | 'us'`
- [x] 1.2 `src/services/targetService.ts`：`computeBmr` 增加 unknown 分支（末项 −78）；新增导出 `GOAL_PRESETS`（减脂 0.30/0.25/0.45、维持体重 0.25/0.25/0.50、增肌 0.25/0.20/0.55，字段 label/desc/protein/fat/carb）
- [x] 1.3 新增单位换算纯函数（`src/services/unit.ts` 或并入 targetService）：`cmTo FtIn` / `ftInToCm` / `kgToLb` / `lbToKg`，含精度取整
- [x] 1.4 `src/services/configStore.ts`：`DEFAULT_CONFIG`（gender 改 `'unknown'`、补 `onboarded: false`、`unit_system: 'metric'`，配比维持 0.45/0.30/0.25）；`validateConfig` 性别放宽为三值；`normalizeConfig` 归一化新字段（onboarded 缺失→false，unit_system 缺失/非法→metric）
- [x] 1.5 `src/theme.ts` 扩展 light/dark 两套 token + 宏量语义色常量（热量/蛋白/脂肪/碳水/步数）；安装 `expo-haptics`

## 2. 引导向导

- [x] 2.1 新增 `src/screens/OnboardingScreen.tsx` 骨架：4 步进度指示（第 N 步 / 共 4 步 + 进度条）、上一步/下一步导航、draft state
- [x] 2.2 第 1 步：离线卖点文案（纯本地离线，数据不出设备）+ 三个目标选项卡片（GOAL_PRESETS，展示配比），未选目标禁用下一步
- [x] 2.3 第 2 步：年龄/身高/体重输入 + 公制/美制切换（身高 ft+in 双字段、体重 lb），切换双向换算，字段校验（年龄 1~120、身高体重为正）不通过禁用下一步
- [x] 2.4 第 3 步：性别选择 男/女，默认「不选」，可跳过
- [x] 2.5 第 4 步：五档活动强度单选（复用 ACTIVITY_LEVELS），默认预选久坐不动，点「完成」提交
- [x] 2.6 完成流程：组装 AppConfig（模板配比 + 身体参数 + gender + activity_factor + `onboarded: true`）→ Bottom Sheet 完成弹窗（TDEE Count-Up 预览，见 design D8）→「开始记录」确认后 saveConfig 并由门控切到主界面

## 3. 门控与「我的」页

- [x] 3.1 `App.tsx`：loading 加载态；`config && !config.onboarded` 时渲染 OnboardingScreen，否则渲染 RootTabs
- [x] 3.2 `src/screens/ProfileScreen.tsx`：删除局部 4 预设，改用 GOAL_PRESETS（3 个）；性别 chips 增加第三个「保密」（unknown）；单位切换（metric/us）随 `unit_system` 持久化，身高体重输入支持美制；BMR 说明文案更新为「男 +5；女 −161；未选 −78」

## 4. 测试与验证

- [x] 4.1 `tests/targetService.test.ts`：补 unknown 性别 BMR 用例（70/170/30 → 1534.5）、GOAL_PRESETS 配比断言；既有用例回归
- [x] 4.2 `tests/configStore.test.ts`：新字段归一化用例（缺省 onboarded/unit_system、非法 gender 回退 unknown、三值性别校验通过）
- [x] 4.3 运行 `npx tsc --noEmit` 与 `npx vitest run` 全部通过
