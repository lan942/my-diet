## Context

- 现状：`step_log` 表类型上已支持 `source: 'manual' | 'platform'`（types.ts），但服务层只有 `recordPlatformSteps` 一个写入入口，且无条件覆盖任何既有行（含 manual 行）；规格明确「不提供手动录入」，权限拒绝/平台不可用/读取失败时步数卡无兜底手段。
- 用户痛点：设备健康平台数据偶发读不到（未装 Health Connect、权限被拒、SDK 临时故障），步数与活动消耗失真且无法修正。
- 相关代码：`src/services/stepService.ts`（唯一写入入口）、`src/hooks/useDeviceSteps.ts`（自动同步时机/单飞/节流）、`src/screens/IntakeScreen.tsx`（步数卡 UI，五种同步态分支）、`src/components/EditSheet.tsx`（通用单步编辑抽屉壳：grabber + 标题 + hint/error + Save + 手势下拉关闭）。
- 约束：所有弹窗统一自定义底部抽屉（禁系统 Alert）；`ERR.INVALID_STEPS` 错误码已存在；steps_kcal 为纯派生值（energyBalance.ts），无需迁移；备份结构不变。

## Goals / Non-Goals

**Goals:**

- 任何同步态（含平台不可用/权限拒绝/同步失败降级态）都能手动录入或修正当前查看日期的步数。
- 手动值作为该日用户显式覆盖值：平台自动同步不覆盖，清除后恢复平台权威。
- 升级遗留 manual 历史行转为可编辑/可清除的普通手动覆盖值。
- 全链路双语、深浅色主题适配，vitest 用例覆盖优先级规则。

**Non-Goals:**

- 不做步数历史列表/趋势图表。
- 不做手动值与平台值合并策略（如取较大值/累加）。
- 不新增任何健康数据写入权限或云同步。
- 不改 `step_log` schema 与备份结构（无迁移）。

## Decisions

1. **manual 行定位为「用户显式覆盖值」，平台写入跳过，清除即恢复平台权威**
   - 备选 A（维持现状，平台无条件覆盖）：手动值会在下一次 focus 自动同步时被静默抹掉，兜底完全失效，不可接受。
   - 备选 B（manual/platform 双值并存 + 展示层择一）：引入合并策略复杂度，两个值语义混乱。
   - 采用统一规则：`source=manual` = 该日用户说了算；清除（删行）= 放弃覆盖，后续平台读取正常写入。legacy manual 行直接纳入同一规则，无需区分「新旧 manual」，零迁移成本。

2. **服务层强制 + hook 层优化的双层跳过**
   - `recordPlatformSteps` 事务内 SELECT 命中 `source='manual'` 时直接返回既有行不写入——这是规格强制点，防未来新调用方绕过。
   - `useDeviceSteps.syncDate` 发起前检查当日来源，manual 则直接跳过，省一次平台聚合调用；hook 已持有 `stepLogs`（来自 AppContext），无额外查询。

3. **抽屉复用 `EditSheet` 壳 + 数字键盘 TextInput，不新建组件文件**
   - 备选：RulerPicker 刻度尺——步数可达 5–6 位数，刻度尺拖动精度差、成本高，不适用；数字键盘对大数值更自然。
   - `TextInput` 设 `keyboardType="number-pad"`、`maxFontSizeMultiplier`、theme token 配色；校验规则：非负整数且 ≤ 100000（服务层复用 `ERR.INVALID_STEPS` 抛 `StepError`，UI 层经 `error` prop 展示双语提示，保存按钮前置拦截）。

4. **入口与来源标记**
   - 步数卡右上角新增 pencil 图标按钮，所有同步态下均可点（含 unavailable/denied 降级态）——兜底能力不随同步态消失。
   - manual 行展示小号「手动/Manual」胶囊标签（textMuted 配色），与 platform 同步值区分；打开抽屉时预填当前值，若该日为 manual 则显示「清除手动值」次级按钮（文字按钮，点击后单事务删行 + refresh）。
   - 已连接态下当日为 manual 时，点击刷新按钮给出 Toast「当日为手动录入，已跳过平台同步」，`handleSyncSteps` 在调用 `syncNow` 前判断，不扩展 hook 返回类型。

5. **手动保存后原地 refresh**
   - 沿用「AppContext.refresh() 不动 loading」约定：抽屉 onSave 成功后 `await refresh()` + 关抽屉 + Light Impact 触觉反馈；steps_kcal 由 energyBalance 纯派生即时重算，无需任何额外写入。

## Risks / Trade-offs

- [legacy manual 行受保护后，平台永远无法自动覆盖该日] → 用户可在抽屉内一键清除；打开抽屉时展示当前来源提示，路径可发现。
- [刷新按钮在 manual 日"无效果"引发困惑] → 点击即 Toast 明示跳过原因；manual 标签同时在卡上可见。
- [recordPlatformSteps 返回值语义变化（命中 manual 时返回既有行）] → 调用方仅用「返回非 null」判定成功并记节流时间戳，语义兼容；vitest 补回归用例锁死。
- [自动同步跳过 manual 日后，该日平台数据永久陈旧] → 属产品语义（用户显式覆盖优先）；清除手动值即自动恢复同步，无需额外入口。

## Migration Plan

无 schema 变更、无迁移脚本、备份结构不变：升级即生效，回滚仅需 revert 提交。legacy manual 行无需转换——现行 mapRow 已将其映射为 `manual` 来源。

## Open Questions

无（上限 100000、抽屉复用 EditSheet、清除交互均已定）。
