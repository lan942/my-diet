## Why

食物库「新增/编辑食物」抽屉（EditSheet）在 Android 真机上被软键盘盖住：聚焦下方数字字段（碳水/脂肪/GI/备注）后，键盘遮住抽屉下半部分，内容区无法滚动到被遮字段，保存按钮也不可见，导致编辑无法完成。根因是 EditSheet 的 `KeyboardAvoidingView` 在 Android 端 `behavior="height"` 依赖窗口 `adjustResize` 才能拿到正确键盘高度，而 Expo 主 Activity 默认 `adjustPan`，键盘弹出时窗口不缩放，偏移失效。

## What Changes

- EditSheet 键盘避让改为「键盘高度监听 + 底部内边距」方案：`Keyboard.addListener('keyboardDidShow/Hide')` 实测键盘高度，键盘弹出时给抽屉容器加 `paddingBottom = 键盘高度`（iOS 保留 `KeyboardAvoidingView padding` 平滑动画），不再依赖 Activity 窗口缩放模式
- 抽屉 ScrollView 增加 `keyboardDismissMode="on-drag"`：下滑内容区可收键盘，配合内容可滚动，任何字段都可达
- 键盘弹出时抽屉最大高度自适应压缩（`maxHeight` 从固定 88% 改为 `屏幕高 - 键盘高 - 安全区` 的动态值），保证保存按钮始终可见
- 覆盖所有使用 EditSheet 的表单页：食物库新增/编辑、体重编辑、基础信息编辑、步数手动录入等（共用组件，一改全生效）

## Capabilities

- `device-adaptation`（MODIFIED）：软键盘弹出时底部抽屉表单必须完全可达——键盘不遮挡输入字段与保存按钮，内容可滚动，可下滑收键盘

## Impact

- **代码**：`src/components/EditSheet.tsx`（键盘监听 + 动态 padding/maxHeight + keyboardDismissMode）
- **受益页面**：FoodLibraryScreen 食物表单、ProfileScreen 体重/身高/年龄/目标编辑、IntakeScreen 步数手动录入等全部 EditSheet 消费方
- **无 schema / 数据迁移**
- **无破坏性变更**：iOS 行为不变（保留 KeyboardAvoidingView），Android 行为修复
