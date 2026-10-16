## RENAMED Requirements

FROM: ### Requirement: 「我的」合并页与四 Tab 导航
TO: ### Requirement: 「我的」合并页与三 Tab 导航

## MODIFIED Requirements

### Requirement: 「我的」合并页与三 Tab 导航
应用底部 Tab SHALL 为 3 个且顺序为「今日、食物库、我的」（不再包含独立「步数」Tab，步数数据在「今日」页整合展示），应用启动后默认选中「今日」Tab；「我的」页 SHALL 自上而下包含两个分区：
- **PROFILE & TARGETS（设置与目标）**：4 张极简结果摘要卡——1. Goal（目标模板名 + 每日目标 kcal）、2. Body Metrics（年龄 • 身高 • 体重，按单位偏好显示）、3. Biological Sex（男/女/保密）、4. Activity Level（档位名 ×系数），每张卡 SHALL 展示一行摘要文字并提供编辑入口。摘要卡 SHALL 采用卡片化软投影风格（Soft Card）并按 Goal/Body Metrics/Biological Sex/Activity Level 顺序分别以总热量橙、蛋白质靛蓝、脂肪琥珀、碳水翡翠绿的 4px 左侧语义色条点缀（小面积语义色，正文保持中性色）；
- **PREFERENCES & DATA（偏好与数据）**：单位系统切换、导出数据、导入恢复、清空/重置全部数据（红色破坏性样式）。

页面 SHALL NOT 展示平铺表单、全局「保存全部」按钮与自定义宏量配比输入框，SHALL NOT 展示体重录入表单与体重历史列表。

#### Scenario: Tab 顺序与初始落地页
- **WHEN** 用户完成引导后打开应用
- **THEN** 底部导航按「今日 / 食物库 / 我的」顺序显示 3 个 Tab，默认选中「今日」，不存在「步数」Tab

#### Scenario: 摘要卡分区展示
- **WHEN** 用户切到「我的」Tab
- **THEN** 页面展示 4 张摘要卡（每张含编号标题、一行当前配置摘要与编辑入口）与「偏好与数据」分区，无平铺表单与统一保存按钮

#### Scenario: 摘要随配置实时更新
- **WHEN** 用户在任一编辑抽屉中保存修改
- **THEN** 对应摘要卡文字立即更新，今日页热量目标（含步数调整后目标）基于新配置即时生效
