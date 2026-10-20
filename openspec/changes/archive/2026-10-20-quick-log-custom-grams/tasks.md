## 1. i18n 文案

- [x] 1.1 在 `src/i18n/zh.ts` 与 `src/i18n/en.ts` 新增编辑入口与校验提示文案 key（如 `food.gramsEditHint` 点击编辑提示、`food.gramsInvalid` 非法克数提示），中英文双写

## 2. QuickLogSheet 精确克数自由编辑

- [x] 2.1 在 `src/components/QuickLogSheet.tsx` 克数模式区新增可编辑克数显示：点击当前克数数值切换为 `TextInput`（`keyboardType="number-pad"`、自动聚焦、`selectTextOnFocus`），失焦或提交后回到文本显示态
- [x] 2.2 实现输入清洗与校验：`onChangeText` 过滤非数字字符；`onBlur`/提交时解析为整数并校验 1–2000 范围，非法时显示 `food.gramsInvalid` 提示并回退到上一次有效克数
- [x] 2.3 实现手动输入与刻度尺双向同步：TextInput 确认有效值后 `setGrams`（RulerPicker 依靠既有 clamp 机制吸附显示）；刻度尺 `onChange` 同步更新 TextInput 显示值
- [x] 2.4 将克数模式 RulerPicker 的 `max` 从 500 调整为 2000（`min`/`step` 不变）
- [x] 2.5 校验视觉与主题：输入态样式走 `theme.ts` tokens，深色/浅色模式下边框、文字、错误色均正常；`numberOfLines={1}` 防换行；`maxFontSizeMultiplier={1.4}` 与现有文本一致

## 3. 测试与校验

- [x] 3.1 新增/更新单元测试：任意克数输入后 `effectiveGrams` 与营养预览按输入值换算；非法输入（空、0、负数、非数字、>2000）被拒绝且保留上次有效值；输入后拖刻度尺双向同步；提交任意克数写入记录
- [x] 3.2 运行 `npx tsc --noEmit`、lint、`vitest run` 全部通过
- [x] 3.3 运行 `openspec validate quick-log-custom-grams --strict` 通过

## 4. 版本与交付

- [x] 4.1 版本号顺延：app.json 与 android/app/build.gradle 同步更新 versionName/versionCode
- [x] 4.2 clean 构建 release APK 并按 UTF-16LE 字节探针法验证产物新鲜度，打包 ZIP 待微信交付
