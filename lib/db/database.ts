import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { config } from "@/lib/config";

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;

  mkdirSync(dirname(config.databaseUrl), { recursive: true });
  db = new Database(config.databaseUrl);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gemini_api_key_encrypted TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      department_id TEXT,
      status TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      aspect_ratio TEXT NOT NULL,
      image_size TEXT NOT NULL,
      output_format TEXT NOT NULL,
      input_images TEXT NOT NULL,
      output_images TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      duration_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT,
      username TEXT,
      department_id TEXT,
      target_id TEXT,
      message TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  const departmentStmt = database.prepare(`
    INSERT OR IGNORE INTO departments (id, name, enabled, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?)
  `);
  departmentStmt.run("rd_1", "研发一部", now, now);
  departmentStmt.run("rd_2", "研发二部", now, now);

  database
    .prepare(`
      INSERT OR IGNORE INTO users
        (id, username, display_name, password_hash, role, department_id, status, enabled, created_at, updated_at)
      VALUES
        ('admin', 'admin', '管理员', 'UNSET', 'admin', NULL, 'active', 1, ?, ?)
    `)
    .run(now, now);

  const settings = [
    ["defaultModel", config.defaultModel],
    ["allowedModels", JSON.stringify(config.allowedModels)],
    ["proxyEnabled", String(config.proxyEnabled)],
    ["appHttpProxy", config.appHttpProxy],
    ["appHttpsProxy", config.appHttpsProxy],
    ["uploadMaxImages", String(config.uploadMaxImages)],
    ["uploadMaxFileSizeMb", String(config.uploadMaxFileSizeMb)],
    ["outputDir", config.outputDir]
  ];

  const settingStmt = database.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);
  for (const [key, value] of settings) {
    settingStmt.run(key, value, now);
  }
}
