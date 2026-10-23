## Context

`EditSheet` 是全局单步编辑抽屉（grabber + 标题 + ScrollView 内容 + 保存按钮），被食物库表单、Profile 各项编辑、步数手动录入等复用。当前键盘避让实现：

```
Modal > mask > KeyboardAvoidingView(behavior: ios=padding / android=height) > Animated.View(sheet)
```

Android 端 `behavior="height"` 的工作原理是监听 `onGlobalLayout` 测量窗口被压缩的高度差作为键盘高度——这要求 Activity `windowSoftInputMode="adjustResize"`。Expo 模板默认 `adjustPan`（窗口不缩放、内容被键盘顶起），此时 KAV 测得高度差为 0，避让失效。虽然可在 AndroidManifest 改 `adjustResize`，但会影响全应用布局行为（背景图、绝对定位元素、其余页面的滚动锚点），副作用面太大。

约束：不改 Activity `windowSoftInputMode`；iOS 保持现有平滑行为；禁用系统 Alert 的既有约定不受影响；所有 EditSheet 消费方零改动。

## Goals / Non-Goals

**Goals:**
- Android 真机上键盘弹出时，EditSheet 内所有字段与保存按钮完全可见可达
- 抽屉高度被键盘压缩后，内容区可滚动到任意字段
- 内容区下滑可收起键盘（`keyboardDismissMode="on-drag"`）
- iOS 行为零回归

**Non-Goals:**
- 不修改 AndroidManifest 的 `windowSoftInputMode`（避免全应用布局副作用）
- 不改动任何 EditSheet 消费方页面
- 不引入 react-native-keyboard-aware-scroll-view 等第三方依赖

## Decisions

### 1. Android 走 Keyboard 事件监听 + 动态 paddingBottom/maxHeight

- `Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height))` / `'keyboardDidHide' → 0`
- 键盘弹出时 sheet 样式叠加：`paddingBottom += keyboardHeight`、`maxHeight = screenHeight - keyboardHeight - insets.top - 16`（16 为顶部留白）
- 选 `keyboardDidShow` 而非 `keyboardWillShow`：Android 只发 Did 事件（Will 是 iOS 专属），Did 弹出后抽屉跳变一帧可接受（Modal 内组件，无转场连续性要求）；iOS 分支不用此逻辑

**为什么不用** `useKeyboardHandler`（react-native-reanimated 系）：项目未装 reanimated v3+ 的 keyboard 扩展，引入成本高；原生 `Keyboard` API 足够。

### 2. iOS 保留 KeyboardAvoidingView padding

现有 iOS 行为经多版本验证平滑正常，不动。Platform 分支：

```tsx
const keyboardAvoidStyle = Platform.OS === 'android'
  ? { paddingBottom: keyboardHeight, maxHeight: screenH - keyboardHeight - insets.top - 16 }
  : {};
```

Android 分支下 KAV 的 `behavior="height"` 已失效也无害，但为避免双重偏移，Android 时 KAV behavior 置为 `undefined`（组件退化普通 View）。

### 3. ScrollView 加 keyboardDismissMode="on-drag"

配合 `keyboardShouldPersistTaps="handled"`（既有），用户下滑内容区收键盘、点按钮不被拦截。不加 `automaticallyAdjustKeyboardInsets`（iOS 专属且与 KAV 叠加会双重偏移）。

### 4. maxHeight 从静态 88% 改为动态计算

原 `maxHeight: '88%'` 是 sheet 相对 KAV 容器（flex:1 全屏）的百分比。Android 键盘弹出后 KAV 不缩放（adjustPan），88% 仍会越界；改为 `Dimensions.get('window').height - keyboardHeight - insets.top - 16` 的绝对值，键盘未弹时 keyboardHeight=0 等价于接近全屏（保留顶部 16 留白 + 状态栏），视觉与 88% 差异可接受且更稳。

## Risks / Trade-offs

- [keyboardDidShow 晚于键盘动画完成，抽屉跳变一帧] → Modal 内组件无转场连续性要求，可接受；食物表单字段聚焦场景为主，跳变发生在键盘完全弹出后，字段立即可达
- [Dimensions 在折叠屏/分屏变化时陈旧] → 项目目标设备为手机竖屏，不处理分屏；Dimensions 在组件挂载时取一次即可
- [某些 Android 机型 keyboardHeight 含导航栏、某些不含] → paddingBottom 用实测值即使略大也只是抽屉抬高一点，不会出现遮挡；实测验证覆盖

## Migration Plan

纯客户端 UI 修复，无 schema 变更。实现 → vitest 全绿（组件逻辑无单测，靠 tsc/lint + 真机回归）→ openspec validate --strict → 版本号顺延（v1.9.6 / versionCode 35）→ clean 构建 APK 交付。回滚 = revert 对应 commit。

## Open Questions

（无）
