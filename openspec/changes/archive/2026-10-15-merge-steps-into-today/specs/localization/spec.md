## MODIFIED Requirements

### Requirement: 日期与数字按 locale 格式化
展示层日期（列表日期标签、周报等）SHALL 按 `Intl.DateTimeFormat(locale)` 格式化；数值展示 SHALL 按 locale 数字格式化（千分位等）。SQLite 存储格式 SHALL 不变（日期仍为本地 `YYYY-MM-DD`，时间 `YYYY-MM-DD HH:mm:ss`）。

#### Scenario: 英文环境日期格式
- **WHEN** 系统 locale 为 en-US 并在今日页切换查看历史日期的步数与摄入
- **THEN** 日期以英文习惯展示（如 Oct 10），数据库内仍为 2026-10-10

#### Scenario: 存储格式不受 locale 影响
- **WHEN** 任意 locale 下录入当日数据
- **THEN** 数据库存储的日期字段仍为 `YYYY-MM-DD` 格式，跨 locale 读取一致
