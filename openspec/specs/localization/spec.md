## Purpose
面向海外发布的双语（en/zh）界面：语言包驱动的全部 UI 文案、跟随系统语言判定、服务层错误码国际化与 locale 感知格式化。

## Requirements

### Requirement: 提供双语语言包与系统语言判定
系统 SHALL 提供 `en` 与 `zh` 两套语言包（key-value JSON），UI 全部文案 SHALL 经语言包输出，SHALL NOT 在组件中硬编码业务文案。语言判定 SHALL 跟随系统 locale：`zh*` 前缀映射为 zh，其余一律回退为 en（默认英文）。语言包 SHALL 支持参数插值（如步数校验消息中的数值）。

#### Scenario: 英文系统显示英文
- **WHEN** 设备系统语言为英语并启动应用
- **THEN** 所有页面文案显示英文（Tab 标签、按钮、提示、错误消息）

#### Scenario: 中文系统显示中文
- **WHEN** 设备系统语言为中文并启动应用
- **THEN** 所有页面文案显示中文，与迁移前语义一致

#### Scenario: 未支持语言回退英文
- **WHEN** 设备系统语言为法语（未提供语言包）
- **THEN** 应用回退显示英文文案，不出现缺 key 的裸标识符

### Requirement: 服务层错误消息国际化
services 层 SHALL 抛出携带错误码（如 `ERR_INVALID_AGE`、`ERR_INVALID_STEPS`）的业务 Error，SHALL NOT 抛出面向用户的中文/英文字面消息；UI 层 SHALL 将错误码经语言包翻译为当前语言文案后展示。vitest 对 services 的断言 SHALL 基于错误码。

#### Scenario: 校验失败返回错误码
- **WHEN** services 校验步数为 -100 失败
- **THEN** 抛出的 Error 携带错误码 `ERR_INVALID_STEPS`，UI 层将其翻译为当前语言的「步数必须为非负数」类文案展示

#### Scenario: 错误码翻译覆盖全部业务错误
- **WHEN** 遍历全部业务错误码检查语言包
- **THEN** en.json 与 zh.json 均包含每个错误码的完整翻译，无缺失

### Requirement: 日期与数字按 locale 格式化
展示层日期（列表日期标签、周报等）SHALL 按 `Intl.DateTimeFormat(locale)` 格式化；数值展示 SHALL 按 locale 数字格式化（千分位等）。SQLite 存储格式 SHALL 不变（日期仍为本地 `YYYY-MM-DD`，时间 `YYYY-MM-DD HH:mm:ss`）。

#### Scenario: 英文环境日期格式
- **WHEN** 系统 locale 为 en-US 并查看步数历史
- **THEN** 日期以英文习惯展示（如 Oct 10），数据库内仍为 2026-10-10

#### Scenario: 存储格式不受 locale 影响
- **WHEN** 任意 locale 下录入当日数据
- **THEN** 数据库存储的日期字段仍为 `YYYY-MM-DD` 格式，跨 locale 读取一致
