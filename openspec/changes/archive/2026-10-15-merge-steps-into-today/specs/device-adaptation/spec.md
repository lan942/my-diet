## MODIFIED Requirements

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

### Requirement: Android 大屏与折叠屏弹性约束
系统 SHALL 在平板/折叠屏展开宽度下对内容区应用 maxWidth（≤640 逻辑像素）居中约束，列表 SHALL 可滚动，SHALL NOT 出现卡片过度拉伸、文字单行过长或崩溃，满足 Google Play 大屏基本可用要求。

#### Scenario: 折叠屏展开内容居中
- **WHEN** 在折叠屏展开态（约 700+ 逻辑像素宽）打开今日页
- **THEN** 内容区居中且宽度不超过 640，卡片不拉伸变形

#### Scenario: 平板大屏操作可用
- **WHEN** 在 Android 平板分辨率下遍历三个 Tab 并完成一次打卡
- **THEN** 全部功能可操作、无崩溃、无元素裁切
