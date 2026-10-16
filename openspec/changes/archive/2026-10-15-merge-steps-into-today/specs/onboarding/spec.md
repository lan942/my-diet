## MODIFIED Requirements

### Requirement: 首次启动展示引导向导
应用 SHALL 在用户未完成引导（配置 `onboarded` 为 false）时展示全屏引导向导，取代三 Tab 主界面；引导完成并确认弹窗后 SHALL 持久化 `onboarded: true` 并进入主界面，此后启动 SHALL 不再展示向导。向导 SHALL 展示 4 步进度指示（第 N 步 / 共 4 步）并提供上一步/下一步导航。

#### Scenario: 首次启动进入向导
- **WHEN** 全新安装后首次打开应用（配置中 `onboarded` 为 false）
- **THEN** 应用展示引导向导而非三 Tab 主界面，进度指示为第 1 步

#### Scenario: 完成引导后不再出现
- **WHEN** 用户走完 4 步并确认完成弹窗，之后再次启动应用
- **THEN** 直接进入三 Tab 主界面，不再展示向导

### Requirement: 完成弹窗与进入主界面
用户点击「完成」后 SHALL 弹窗提示设置完成并可开始记录（如「设置完成，可以开始记录今天的饮食了」），用户确认后 SHALL 进入三 Tab 主界面；确认前 SHALL NOT 进入主界面。

#### Scenario: 完成弹窗确认后进入主界面
- **WHEN** 用户在第 4 步点击「完成」并确认弹窗
- **THEN** 引导结果（目标配比/年龄/身高/体重/性别/活动量）一次性写入配置且 `onboarded` 置 true，应用切换到三 Tab 主界面（今日 / 食物库 / 我的）
