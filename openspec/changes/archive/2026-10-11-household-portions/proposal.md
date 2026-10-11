## Why

凭空估计「100g 有多少」违背直觉。为 Quick Log 抽屉加入生活化参考单位（Household/Visual Portions，国际通用的手掌/拳头/杯勺估算法），大幅降低记录门槛；份量与克数双模式无缝切换，克数与营养预览自动联动。

## What Changes

- food_item 新增 `portions TEXT`（JSON 数组）可空列，幂等迁移；种子为常见食物写入双语生活化份量预设（zh/en 标签 + 克数锚点），自定义食物为 null（仅克数模式）
- QuickLogSheet 双模式：食物带 portions 时默认「份量」模式——预设份量胶囊切换锚点、数量刻度尺（0.5–8，步进 0.5）、`≈ Xg` 动态换算提示；「克数」模式保持现状（预设克数片 + 刻度尺）；两者营养预览共用
- 备份/恢复链路兼容 portions 列（旧备份缺省 null）
- 主 spec：daily-intake「从食物库快捷记录摄入」升级双模式；food-library 新增生活化份量数据需求

## Capabilities

### Modified Capabilities

- `food-library`：新增生活化份量数据需求（列 + 种子预设 + 备份兼容）
- `daily-intake`：Quick Log 抽屉支持份量/克数双模式换算

## Impact

- 数据集仅追加 portions 预设，营养值不变；无 portions 的食物 UI 不变
- 版本 1.8.0 / versionCode 25，构建交付 ZIP
