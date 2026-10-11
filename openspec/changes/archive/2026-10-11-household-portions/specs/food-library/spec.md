## ADDED Requirements

### Requirement: 生活化份量预设数据
系统 SHALL 为 food_item 提供 portions 可空列（JSON 数组，每项含 zh/en 双语标签与 grams 克数锚点），幂等迁移加列；种子为常见食物写入国际通用手掌/拳头/杯勺估算预设（如鸡胸肉 1 掌心 ≈100g、牛油果半个 ≈100g、杏仁 1 把 ≈30g、橄榄油 1 汤匙 ≈14g、燕麦 1/2 杯干 ≈40g、蓝莓 1 把 ≈75g、黑巧 1 小块 ≈10g 等）；自定义食物 portions 为 null。备份/恢复链路兼容该列（旧备份缺省 null 合法）。

#### Scenario: 种子预设写入
- **WHEN** 新装设备首次种子写入
- **THEN** 鸡胸肉、野生三文鱼、牛油果、大杏仁、橄榄油、红薯、燕麦片、藜麦、蓝莓、90% 黑巧等常见食物的 portions 均为合法 JSON 数组且每项 grams > 0

#### Scenario: 自定义食物无预设
- **WHEN** 用户创建自定义食物
- **THEN** 其 portions 为 null，Quick Log 仅显示克数模式

#### Scenario: 备份往返
- **WHEN** 导出含 portions 的备份并导入恢复
- **THEN** portions 预设完整保留
