// 健康平台连接标志（独立 KV，与 main 配置 JSON 隔离，互不影响校验）。
// 仅记录「用户曾主动授权连接」这一本地事实；真正的权限状态仍以平台读取结果为准。

import { getDb } from '../db/database';

const KEY = 'steps_connection';
const VALUE_CONNECTED = 'connected';

export async function getStepsConnection(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_config WHERE key = ?',
    [KEY]
  );
  return row?.value === VALUE_CONNECTED;
}

export async function setStepsConnected(connected: boolean): Promise<void> {
  const db = await getDb();
  if (connected) {
    await db.runAsync(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      [KEY, VALUE_CONNECTED]
    );
  } else {
    await db.runAsync('DELETE FROM app_config WHERE key = ?', [KEY]);
  }
}
