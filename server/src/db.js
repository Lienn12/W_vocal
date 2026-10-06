import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({ ...config.db, charset: 'utf8mb4', waitForConnections: true, connectionLimit: 10 });

// Mọi truy vấn dùng tham số (?) để tránh SQL injection.
export async function q(sql, params = [], conn = pool) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

export async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(conn);
    await conn.commit();
    return r;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function waitForDb(tries = 30) {
  for (let i = 1; ; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch (e) {
      if (i >= tries) throw e;
      console.log(`Đang chờ cơ sở dữ liệu (${i}/${tries}): ${e.code || e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

export async function migrate() {
  const sql = await fs.readFile(new URL('../sql/schema.sql', import.meta.url), 'utf8');
  for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) await pool.query(stmt);
  // CSDL tạo từ phiên bản cũ chưa có các cột mới: thêm vào mà không đụng tới dữ liệu.
  for (const [col, def] of [['category', "VARCHAR(60) NOT NULL DEFAULT ''"], ['level', "VARCHAR(8) NOT NULL DEFAULT ''"]]) {
    const [rows] = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worlds' AND column_name = ?", [col]);
    if (!rows.length) await pool.query(`ALTER TABLE worlds ADD COLUMN ${col} ${def}`);
  }
}
