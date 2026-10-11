# Tasks: Spec 合规修复

## 1. 双语搜索与显示

- [x] 1.1 `filterFoods` 增加 `name_en` 参与匹配（大小写不敏感，中文/英文关键字均可命中双语种子食物）
- [x] 1.2 新增单测：name_en 搜索命中（chick/CHICKEN/鸡）、未命中回退空数组
- [x] 1.3 IntakeScreen 食物选择器按钮与下拉列表改用 `foodDisplayName()`

## 2. 系统 Alert 全量替换（17 → 0）

- [x] 2.1 新建共享组件 `src/components/Toast.tsx`（useToast hook + Toast 淡入淡出视图，1.8s 自动消失）
- [x] 2.2 IntakeScreen：校验错误/保存失败 → 内联红字（选择食物、输入克数时清除）；删除失败 → Toast
- [x] 2.3 StepScreen：步数非法/保存失败 → 内联红字；同步不可用/权限拒绝 → 同步区内联红字；同步成功/手动优先保护 → Toast
- [x] 2.4 EditSheet 新增 `error` 属性（Save 按钮上方红字），ProfileScreen 4 个编辑抽屉接入：保存失败抽屉保持打开并内联展示
- [x] 2.5 ProfileScreen：导出/导入/清空 IO 错误 → Toast；导入成功 → Toast
- [x] 2.6 OnboardingScreen：完成抽屉保存失败 → Start 按钮上方内联红字（抽屉保持打开）
- [x] 2.7 FoodLibraryScreen 本地 toast 逻辑重构为共享 useToast（删除重复实现与无用 Animated/useRef/useEffect 导入）

## 3. 文档与版本

- [x] 3.1 FoodLibraryScreen 头部注释移除 SUPERFOOD 残留描述
- [x] 3.2 版本号三处同步：app.json 1.8.2/27、android/app/build.gradle versionCode 27 / versionName 1.8.2

## 4. 验证

- [x] 4.1 `npx tsc --noEmit` 零错误
- [x] 4.2 `npx vitest run` 96/96 通过（含新增 name_en 搜索测试）
- [x] 4.3 `npx expo lint` 零警告
- [x] 4.4 `npx openspec validate --all` 11/11 通过
- [x] 4.5 全项目 grep `Alert\.` 零命中
