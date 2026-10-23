## ADDED Requirements

### Requirement: 底部抽屉软键盘避让

系统 SHALL 保证所有基于 EditSheet 的底部抽屉表单在软键盘弹出时完全可达：键盘 SHALL NOT 遮挡任何输入字段与保存按钮。Android 端 SHALL 通过 `Keyboard` 事件实测键盘高度并动态调整抽屉底部内边距与最大高度实现避让，SHALL NOT 依赖 Activity `windowSoftInputMode` 配置；iOS 端 SHALL 保留 KeyboardAvoidingView padding 行为。键盘弹出时抽屉最大高度 SHALL 压缩为「屏幕高 − 键盘高 − 顶部安全区 − 16」，内容区 SHALL 可滚动至任意字段；内容区下滑 SHALL 收起键盘（keyboardDismissMode="on-drag"），且 `keyboardShouldPersistTaps="handled"` 语义保持不变（点击保存按钮不被键盘拦截）。

#### Scenario: Android 键盘弹出字段可达

- **WHEN** Android 用户在食物库编辑食物抽屉中聚焦「备注」字段，软键盘弹出
- **THEN** 抽屉整体上移避开键盘，「备注」输入框与「保存」按钮均完整可见，无需额外操作即可继续输入与保存

#### Scenario: 抽屉高度压缩后内容可滚动

- **WHEN** Android 用户在键盘弹出状态下编辑食物（表单含名称/热量/蛋白质/碳水/脂肪/GI/备注共 7 个字段）
- **THEN** 抽屉高度被压缩至键盘上方，内容区可垂直滚动到任意字段，无字段被键盘或抽屉边界裁剪

#### Scenario: 下滑内容区收起键盘

- **WHEN** 键盘弹出状态下，用户在抽屉内容区做下滑手势
- **THEN** 软键盘收起，抽屉恢复全高；若用户点击保存按钮，保存动作正常触发（不被键盘遮挡或事件拦截）

#### Scenario: iOS 行为零回归

- **WHEN** iOS 用户打开任意 EditSheet 抽屉并聚焦任意输入字段
- **THEN** 键盘弹出时抽屉以既有 KeyboardAvoidingView padding 方式平滑上移，行为与修复前一致

#### Scenario: 键盘高度实测避让不依赖窗口缩放

- **WHEN** Activity `windowSoftInputMode` 保持 Expo 默认（adjustPan，窗口不缩放）
- **THEN** Android 端避让仍生效（键盘高度来自 Keyboard 事件实测，非窗口压缩量），且 AndroidManifest 不被修改

## MODIFIED Requirements

（无）

## REMOVED Requirements

（无）
