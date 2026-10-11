## Decisions

- D1 存储：`portions TEXT` JSON 数组（FoodPortion { zh, en, grams }），双语标签随数据走（与 name_en/notes_en 同策略）；自定义食物 null。幂等 PRAGMA 迁移；parsePortions 容错（非法 JSON → null）。
- D2 种子预设（锚点克数按用户对照表）：鸡胸肉/三文鱼 掌心 100g + 1 块 150g；蛋白 1 份蛋清 30g；鸡蛋 1 个 50g；希腊酸奶 1 盒 150g + 1 杯 245g；牛油果 半个 100g + 1 整个 200g；杏仁 1 把 30g + 10 粒 12g；橄榄油 1 汤匙 14g + 1 茶匙 4.5g；红薯 1 个中等 150g + 1 拳头 100g；燕麦片 1/2 杯干 40g + 1 杯干 80g；藜麦 1/2 碗熟 90g + 1 碗熟 185g；全麦面包 1 片 35g；西兰花 1 杯切 90g；菠菜 2 杯生 60g；蓝莓 1 把 75g + 1 杯 150g；黑巧 1 小块 10g + 2 小块 20g。其余食物（豆腐/虾/奇亚籽/核桃/糙米/意面/扁豆/覆盆子/梨/番茄）不给预设，保持克数模式。
- D3 UI：QuickLogBody 有 portions 时顶部加 SegmentedControl（份量 | 克数，默认份量）；份量模式 = 预设份量胶囊（切换锚点）+ 数量刻度尺（0.5–8 step 0.5，formatValue 去尾零）+ `≈ Xg` 提示；克数模式维持现状。grams = Math.round(qty × portion.grams)。加餐/餐次/预览/提交逻辑共用。
- D4 备份：parseBackup/restoreAllData 带 portions（字符串原样），旧备份 null 合法。

## Tasks

- [x] 1.1 types(FoodPortion/FoodItem.portions) + schema 列 + 迁移 + mapItemRow/INSERT/种子预设 + parsePortions
- [x] 1.2 备份链路（parseBackup/restoreAllData）
- [x] 2.1 QuickLogSheet 双模式 UI + i18n key
- [x] 3.1 vitest（parsePortions/种子预设/备份往返）+ tsc/lint/validate
- [x] 4.1 版本 1.8.0/25 + 构建 + ZIP + 主 spec 同步 + 归档
