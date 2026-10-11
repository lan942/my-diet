## Context

当前「我的」页清空数据链路：`PrefsRow(trash-outline)` → `handleReset()` → `setAction('reset')` → ActionSheet 确认模式（title/message/confirmDanger）→ `resetEverything()`（`DELETE` 全部 4 张业务表 + 配置回 `DEFAULT_CONFIG` + 重新播种）→ `refresh()`。导出数据已验证 ActionSheet 的 options 模式可行（JSON/CSV 双选项、图标 + 副标题）。ActionSheet 组件本身同时支持 options 模式与 confirm 模式，无需改组件。

## Goals / Non-Goals

**Goals:**
- 清空入口提供两个范围选项：仅清空摄入记录 / 清空全部并重置，交互语言与导出双选项一致
- 仅清空摄入记录：保留配置、步数、食物库，不触发首启引导，清完原地刷新今日页
- 破坏性安全：任一范围选中后仍需红色危险二次确认，文案按范围区分
- 双语文案齐全，遵守"禁止系统 Alert、统一自定义抽屉"约定

**Non-Goals:**
- 不提供按日期范围/餐次删除摄入记录
- 不改 ActionSheet 组件、无数据库 schema 变更、无迁移
- `resetEverything()` 既有行为不变

## Decisions

1. **两段式抽屉（选范围 → 确认）而非单层选项直执行**
   - 备选 A：像导出一样选项即执行——省一步，但清空是不可逆破坏性操作，误触代价远高于导出；备选 B：单层抽屉同时渲染两选项 + 危险按钮——ActionSheet 现不支持混合模式，需改组件。
   - 选择 A：复用现有两种模式零组件改动，`action` 状态从 `'reset'` 细化为 `{ kind: 'reset'; scope: 'intake' | 'all' } | null`（或两个独立 action 值 `reset-intake` / `reset-all`，实现取后者更直白）。

2. **数据层新增 `clearIntakeLogs()`，服务层薄封装 `clearIntakeData()`**
   - `database.ts`：`DELETE FROM intake_log` 单事务（与 `resetAllData` 同风格）；不删步数/食物/配置。
   - `dataService.ts`：`clearIntakeData()` 直接调用之；无需重新播种（食物库未动）；`resetEverything()` 保持原样。
   - 放 database.ts 而非拼 SQL 于 service，维持"SQL 只在 db 层"的既有分层。

3. **完成后 `refresh()` 原地更新，不动 loading**
   - 项目教训：`refresh()` 不得 `setLoading(true)`，否则导航树重挂跳回首 Tab。仅清摄入后今日页数据原地归零。

4. **选项视觉沿用导出抽屉规格**
   - 仅清摄入：icon `restaurant-outline`，tint `macroColors.calorie`（摄入语义色）；清全部：icon `trash-outline`，tint `colors.danger`。确认抽屉沿用 `confirmDanger` 红色按钮。

5. **无新增纯逻辑，不新增 vitest**
   - 两函数均为薄 IO 封装（expo-sqlite 无法在 node vitest 中测）；现有 64 个用例回归即可。

## Risks / Trade-offs

- [用户在选项抽屉误以为点击即执行] → 每个选项 sub 文案明确"需确认"；第二段确认抽屉文案按范围写明删除内容与不可逆
- [仅清摄入后食物库旧记录仍被今日页引用] → 不涉及：intake_log 删除后今日页自然为空，food_item 保留无悬挂引用（外键方向是 intake→food，删 intake 无副作用）
- [两段抽屉状态管理出错导致关闭后残留] → 沿用现有 `setAction(null)` 单点关闭；onSelect 先 onClose 再 setAction 进入确认段（同导出流程）
