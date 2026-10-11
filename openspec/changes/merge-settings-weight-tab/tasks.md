## 1. 类型与配置层（含迁移）

- [x] 1.1 更新 `src/types.ts`：`AppConfig` 移除 `kcal_per_kg`/`protein_per_kg`，新增 `gender: 'male' | 'female'`、`age: number`、`height_cm: number`、`activity_factor: number`；`TargetResult` 移除 `daily_protein`
- [x] 1.2 更新 `src/services/configStore.ts`：`DEFAULT_CONFIG` 改为 gender male / age 30 / height_cm 170 / activity_factor 1.2 / 配比 0.45/0.30/0.25；`validateConfig` 新增性别枚举、年龄 1~120、身高正数、活动系数五档白名单校验
- [x] 1.3 `loadConfig` 归一化迁移：旧 JSON 缺失档案字段补默认值、废弃字段（kcal_per_kg/protein_per_kg）丢弃、比例字段保留

## 2. 目标计算服务与单测

- [x] 2.1 `src/services/targetService.ts` 新增并导出 `computeBmr`（Mifflin-St Jeor，男 +5 / 女 -161）、`computeTdee`、`ACTIVITY_LEVELS` 常量表（五档 label/desc/factor）
- [x] 2.2 重写 `computeTarget`：TDEE = BMR × activity_factor，按 4/4/9 换算碳水/蛋白/脂肪克数；无体重记录返回 null
- [x] 2.3 重写 `tests/targetService.test.ts`：男女 BMR 断言（1617.5 / 1451.5）、TDEE（×1.2=1941）、默认比例拆分（218.4/145.6/53.9）、无体重 null、活动系数变更影响
- [x] 2.4 更新 `tests/configStore.test.ts`：新字段校验用例（非法年龄/身高/活动系数拒绝）、旧配置 JSON 归一化迁移用例

## 3. UI 合并与导航

- [x] 3.1 新建 `src/screens/ProfileScreen.tsx`：每日目标卡（TDEE kcal + 三大宏量 g + 「估算」说明）→ 基础信息卡（性别切换、年龄、身高、活动量五选一）→ 体重录入卡 → 体重历史卡（复用 Row/删除确认）→ 营养配比卡（4 预设 chip + 高亮 + 3 手动输入 + 比例和提示）→ 保存按钮
- [x] 3.2 预设常量更新为 4 个：减脂均衡 30/25/45、高蛋白减脂 40/20/40、增肌充能 25/20/55、生酮/低碳 20/70/10；点击预设立即保存并全局刷新
- [x] 3.3 删除 `src/screens/WeightScreen.tsx`、`src/screens/SettingsScreen.tsx`
- [x] 3.4 `App.tsx`：`RootTabParamList` 改为 我的/食物库/今日/步数，Tab 图标更新（我的用 person/person-outline）
- [x] 3.5 `src/screens/IntakeScreen.tsx`：蛋白质进度条目标由 `target.daily_protein` 改为 `target.protein_g`

## 4. 验证与交付

- [x] 4.1 `npx vitest run` 全绿；TypeScript 类型检查无报错
- [ ] 4.2 真机自检清单：4 Tab 结构、档案保存后目标联动、预设点击高亮与刷新、无体重记录提示、旧配置升级迁移正常
- [x] 4.3 `app.json` 版本号升级（versionName 1.3.0 / versionCode 递增），构建 APK 打包 ZIP
