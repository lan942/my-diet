## Context

v1.7.0 食物名/备注单语言入库暴露切语言不变的问题。用户确认无存量用户，直接落双语列方案，不做历史数据迁移。

## Goals / Non-Goals

**Goals:** 双语双列存储 + 按 locale 动态显示；种子双写；备份链路兼容。

**Non-Goals:** 不做旧数据名称匹配迁移（无老用户）；不做食物行内双名同显；编辑器不暴露双语输入。

## Decisions

- **D1 列设计**：`name_en TEXT`、`notes_en TEXT` 可空列；`name` 固定存中文（canonical），en 显示取 name_en ?? name。幂等迁移沿用 PRAGMA table_info 模式。
- **D2 显示函数**：foodService 导出纯函数 `foodDisplayName(item, locale = getLocale())` / `foodDisplayNotes(item, locale = getLocale())`；locale 参数可注入便于 vitest。zh → name/notes；en → name_en ?? name。
- **D3 种子双写**：ensureSeedFoods 不再按 locale 二选一，双语全写（name=zh、name_en=en、notes=notes_zh、notes_en=notes_en）。首启 locale 只影响分类名语言（现状保留）。
- **D4 展示位点**：FoodLibraryScreen 列表卡/推荐卡名称与备注、QuickLogSheet 食物名、IntakeScreen 今日记录行 `l.food?.name`；编辑表单 startEdit 预填存储值不变。
- **D5 备份兼容**：buildBackup 序列化 FoodItem 新字段自然带出；parseBackup 对 name_en/notes_en 用 optString 缺省 null；restoreAllData INSERT 补列（`?? null`）。
- **D6 updateFoodItem**：不更新 name_en/notes_en（UI 无入口，保留原值）。

## Risks / Trade-offs

- 自定义食物在 en 界面显示用户输入的原文（可能中文）——接受，用户自建数据自己负责。
- 旧备份文件（无新字段）导入后食物名只剩单语言——接受（无存量用户）。

## Migration Plan

types → schema/migration → service → 展示位点 → 测试 → tsc/lint/vitest/validate → 1.7.1/23 构建 ZIP。
