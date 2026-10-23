## 1. EditSheet 键盘避让改造

- [ ] 1.1 新增 `keyboardHeight` state（默认 0），`useEffect` 内注册 `Keyboard.addListener('keyboardDidShow' / 'keyboardDidHide')`（Android+iOS 统一监听，iOS 分支不使用该值但监听无害），组件卸载时 remove
- [ ] 1.2 Android 分支：KAV `behavior` 置 `undefined`（退化普通 View）；sheet 动态样式叠加 `paddingBottom: spacing.xl + 8 + insets.bottom + keyboardHeight`、`maxHeight: Dimensions.get('window').height - keyboardHeight - insets.top - 16`（keyboardHeight=0 时近似全屏）；iOS 分支样式与行为保持现状（KAV padding + 静态 maxHeight 88%）
- [ ] 1.3 移除样式表中的静态 `maxHeight: '88%'`，改为组件内 Platform 分支计算（样式表只保留背景/圆角/内边距等静态属性）
- [ ] 1.4 ScrollView 增加 `keyboardDismissMode="on-drag"`，保留既有 `keyboardShouldPersistTaps="handled"`
- [ ] 1.5 代码注释说明：Android 不走 KAV height 的原因（adjustPan 下测高失效）+ 动态 padding/maxHeight 的计算依据

## 2. 验证与交付

- [ ] 2.1 `npx tsc --noEmit` 与 `npx expo lint` 无错误
- [ ] 2.2 `npx vitest run` 全绿（无组件单测，确认既有用例不受影响）
- [ ] 2.3 `openspec validate fix-editsheet-keyboard-occlusion --strict` 通过
- [ ] 2.4 版本号顺延至 v1.9.6 / versionCode 35（app.json + android/app/build.gradle 手工同步）
- [ ] 2.5 `gradlew clean assembleRelease`（dangerouslyDisableSandbox）构建 APK，UTF-16LE 字节探针验证新鲜度，打包 my-diet-v1.9.6.zip 待微信交付
- [ ] 2.6 真机回归清单写入交付说明：食物库编辑食物聚焦备注可达、抽屉压缩后可滚动、下滑收键盘、保存按钮不被拦截
