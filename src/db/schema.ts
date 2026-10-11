// SQLite 建表 DDL（幂等）

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS food_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS food_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  kcal_per_100g REAL NOT NULL DEFAULT 0,
  protein_per_100g REAL NOT NULL DEFAULT 0,
  carb_per_100g REAL NOT NULL DEFAULT 0,
  fat_per_100g REAL NOT NULL DEFAULT 0,
  gi INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_food_item_category_id ON food_item (category_id);

CREATE TABLE IF NOT EXISTS intake_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  food_item_id INTEGER NOT NULL,
  grams REAL NOT NULL,
  meal TEXT NOT NULL,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_intake_log_date ON intake_log (date);
CREATE INDEX IF NOT EXISTS ix_intake_log_food_item_id ON intake_log (food_item_id);

CREATE TABLE IF NOT EXISTS step_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  steps INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
