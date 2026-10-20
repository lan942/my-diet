## Context

QuickLogSheet 的「精确克数」模式目前由 `GRAM_PRESETS = [50, 100, 150, 200]` 快捷片和 `<RulerPicker min={10} max={500} step={10} />` 组成。用户只能在这两个维度上选择固定 10g 倍数的克数，无法记录厨房秤常见的任意整克数（如 37g、235g）。

本项目采用 React Native 组件内状态直接管理克数（`useState<number>`），无额外服务层校验；摄入记录通过 `scaleNutrition(food, effectiveGrams)` 换算后写入本地 SQLite，grams 列本身支持任意数值。

## Goals / Non-Goals

**Goals:**
- 精确克数模式下新增自由编辑入口（轻触克数数值 → 数字键盘输入任意整数）
- 手动输入与刻度尺双向同步，保持 UI 一致性
- 输入校验即时反馈，阻止非法值提交并保留上次有效值
- 刻度尺量程上限同步扩展到 2000g，与输入上限对齐

**Non-Goals:**
- 修改「生活化份量」模式（portions 模式不受影响）
- 新增输入组件或包依赖（复用现有 React Native `TextInput`）
- 修改数据 schema 或服务层写入逻辑（`intakeService` 不变）
- 支持小数克数（食物营养值为 per-100g，小数克数精度无意义）

## Decisions

### 1. 采用「点击数值展开 TextInput」的轻量编辑模式，不另弹 Modal
**Rationale**：Quick Log 本身已是 Bottom Sheet Modal，嵌套第二层 Modal 会产生遮罩层叠与关闭手势冲突。在现有刻度尺上方直接切换为 `TextInput`（聚焦自动拉起数字键盘）最轻量，视觉层保持在同一抽屉内，与 iOS/Android 原生输入体验一致。
**Alternative**：在刻度尺下方新增独立输入框常驻展示——被否决，会占据抽屉高度，对不需要精确输入的用户造成视觉噪音。

### 2. TextInput 与刻度尺双向通过同一份 `grams` state 同步
**Rationale**：`grams` 已经是 QuickLogBody 的单一数据源；TextInput 的 `onChangeText` 解析为数字后直接 `setGrams`，刻度尺的 `onChange` 同样写回 `grams`。RulerPicker 的 `clamp` 机制（`Math.max(min, Math.min(max, value))`）自动将超出量程的手动输入值吸附到边界显示，无需额外逻辑。当用户从 235g 拖动到 240g，TextInput 同步显示 240；当用户输入 1999g，刻度尺显示吸附在 2000g（max），但实际 state 仍为 1999g（未超界，允许提交）。

### 3. 校验策略：即时清理非数字字符，失焦/提交时校验范围并保留有效值
**Rationale**：RN `keyboardType="number-pad"` 仍可粘贴非数字内容（Android），`onChangeText` 侧过滤掉非数字字符，保证 state 只有数字字符串；失焦（`onBlur`）时将字符串转整数并钳制到 1–2000，若结果无效（如空、0）则回退到上一次有效值。避免用户在输入中途看到弹窗或覆盖旧值。

### 4. 刻度尺量程上限从 500 提升到 2000
**Rationale**：与手动输入上限对齐，否则用户输入 1500g 后刻度尺无法正确吸附位置（会被 clamp 到 500）。步进保持 10g 不变，因为大范围下细粒度步进会让刻度尺过长（2000/10*12px = 2400px，仍在 ScrollView 可接受范围内）。最小值保持 10g（低于 10g 的食物记录极少，若有需可通过手动输入 1–9g 覆盖）。

## Risks / Trade-offs

- **[Risk] 大刻度尺（2000g）导致 ScrollView 内容宽度膨胀，低端机滑动掉帧** → **Mitigation**：内容宽度约 2400px，ScrollView 已在真机上验证 500g（600px）流畅；若后续实测掉帧，可改为分段大刻度（50g 一级粗刻度，10g 细刻度），当前保持最小改动。
- **[Risk] 用户误触克数数字触发键盘，遮挡营养预览区域** → **Mitigation**：`keyboardShouldPersistTaps="handled"` 已存在，且 `ScrollView` 可在输入时自动上推内容；若遮挡严重，可在 `TextInput` 聚焦时调用 `scrollToEnd`，属可接受的小交互优化。
- **[Risk] 手动输入非 10 倍数后刻度尺视觉上无法停在精确刻度线（因为 step=10 只能吸附到 10 的倍数）** → **Mitigation**：已在决策中说明这是预期行为，RulerPicker 仅作为快速选择工具，精确值由数字显示和 TextInput 承担，不会误导用户。

## Migration Plan

无迁移。现有 intake_record 表 grams 列已支持任意数值；无需数据回填或 schema 变更。旧版本备份在新版本恢复后，若备份中的 grams 为非 10 倍数，打开 Quick Log 编辑时直接显示原值即可（TextInput 兼容任意整数）。

## Open Questions

（无）
