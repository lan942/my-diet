## Purpose
覆盖海外主流设备的适配基线：动态字体缩放不裁切、iPhone SE 小屏可用、Android 高宽比与挖孔屏避让、大屏/折叠屏弹性约束与 iPad 声明。
## Requirements
### Requirement: 动态字体缩放不裁切
系统 SHALL 支持系统字体缩放（allowFontScaling 生效），常规文本缩放上限 SHALL 为 1.4 倍，核心数据大数字（环形仪表盘中心值、TDEE）SHALL 允许缩放至 2.0 倍。所有包含文本的容器 SHALL NOT 使用固定 height，SHALL 使用 minHeight + padding 由内容撑开；受限空间 SHALL 提供换行或滚动。

#### Scenario: 超大字体下文本完整展示
- **WHEN** 用户将系统字体调至最大档并浏览「我的」「今日」「食物库」页
- **THEN** 所有文案完整可见（自动换行或页面滚动），无文字被裁切或重叠

#### Scenario: 超大字体下按钮可用
- **WHEN** 系统字体最大档时点击「保存」「打卡」等按钮
- **THEN** 按钮高度随内容撑开且完整可点击

### Requirement: 小屏设备适配
系统 SHALL 在 iPhone SE 尺寸（375×667 逻辑分辨率）下完整可用：首页环形仪表盘直径 SHALL 随窗口尺寸（useWindowDimensions）缩放，底部 Tab 标签 SHALL 允许缩至最小 11pt，全部操作入口 SHALL 可达。

#### Scenario: iPhone SE 首页无溢出
- **WHEN** 在 375×667 屏幕打开首页
- **THEN** 环形仪表盘完整显示、无水平溢出警告、Tab 栏完整可点

#### Scenario: 小屏录入流程完整
- **WHEN** 在 375×667 屏幕完成一次食物打卡并查看今日页步数卡
- **THEN** 全流程无需横向滚动，键盘弹出时输入框可见，步数卡与能量平衡信息完整可达

### Requirement: Android 高宽比与挖孔屏避让
系统 SHALL 覆盖 18:9、19.5:9、20:9 高宽比屏幕，顶部与底部 SHALL 基于 safe-area-context insets 布局，SHALL NOT 写死顶部状态栏距离，SHALL NOT 被水滴屏/挖孔屏遮挡内容。

#### Scenario: 20:9 长屏顶部不遮挡
- **WHEN** 在 20:9 挖孔屏设备打开任意页面
- **THEN** 顶部标题与内容不被挖孔遮挡，底部 Tab 不被手势条遮挡

#### Scenario: 18:9 常规屏布局正常
- **WHEN** 在 18:9 屏幕打开首页
- **THEN** 布局无异常拉伸或留白突变

### Requirement: Android 大屏与折叠屏弹性约束
系统 SHALL 在平板/折叠屏展开宽度下对内容区应用 maxWidth（≤640 逻辑像素）居中约束，列表 SHALL 可滚动，SHALL NOT 出现卡片过度拉伸、文字单行过长或崩溃，满足 Google Play 大屏基本可用要求。

#### Scenario: 折叠屏展开内容居中
- **WHEN** 在折叠屏展开态（约 700+ 逻辑像素宽）打开今日页
- **THEN** 内容区居中且宽度不超过 640，卡片不拉伸变形

#### Scenario: 平板大屏操作可用
- **WHEN** 在 Android 平板分辨率下遍历三个 Tab 并完成一次打卡
- **THEN** 全部功能可操作、无崩溃、无元素裁切

### Requirement: iPad 不作为受支持设备声明
应用 SHALL 在 iOS 构建配置中声明不支持原生 iPad（supportsTablet: false），以 iPhone 兼容方式运行；若未来启用 iPad SHALL 另行变更。

#### Scenario: 构建配置声明
- **WHEN** 执行 iOS 构建
- **THEN** 产物不包含 iPad 原生布局声明（supportsTablet 为 false），iPhone 上行为不变

### Requirement: 连续刻度尺按实测宽度布局并钳制显示值
应用内全部连续刻度尺（QuickLog 的克数/数量尺、引导与「我的」抽屉的身高/体重尺）SHALL 在布局完成后通过自身 onLayout 实测宽度计算刻度居中边距，SHALL NOT 使用静态窗口尺寸作为宽度来源，以保证分屏、折叠屏、不同屏宽与小屏下刻度对齐正确。当前值显示与程序化滚动定位 SHALL 钳制在该尺声明的 min/max 区间内；该钳制仅影响展示与滚动定位，SHALL NOT 在用户未提交选择时回写外部状态（外部值仍由手势提交或显式设置驱动）。

#### Scenario: 首帧宽度未知时不错误布局
- **WHEN** 刻度尺首次渲染且尚未取得实测宽度
- **THEN** 不按静态窗口宽度错位布局；取得 onLayout 宽度后刻度居中边距正确

#### Scenario: 小屏与分屏宽度正确
- **WHEN** 在窄屏或分屏较窄容器中打开刻度尺
- **THEN** 刻度两端对齐与中间刻度密度按实测容器宽度正确展示，末值刻度可滚到正中

#### Scenario: 越界外部值仅显示被钳制
- **WHEN** 传入刻度尺的 value 超出其 min/max
- **THEN** 显示文本与指示器停在最近的合法端点，但外部 value 状态不被静默改写

