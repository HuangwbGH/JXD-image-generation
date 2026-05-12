const Database = require("better-sqlite3");
const { randomBytes, scryptSync } = require("node:crypto");
const { dirname } = require("node:path");
const { mkdirSync } = require("node:fs");

const password = process.argv[2];
const databaseUrl = process.env.DATABASE_URL || "./storage/app.db";

if (!password || password.length < 6) {
  console.error("Usage: node scripts/set-admin-password.cjs <password>");
  process.exit(1);
}

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

mkdirSync(dirname(databaseUrl), { recursive: true });
const db = new Database(databaseUrl);
const now = new Date().toISOString();

db.prepare(
  `CREATE TABLE IF NOT EXISTS users (
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
  )`
).run();

db.prepare(
  `INSERT INTO users
    (id, username, display_name, password_hash, role, department_id, status, enabled, created_at, updated_at)
   VALUES
    ('admin', 'admin', '管理员', ?, 'admin', NULL, 'active', 1, ?, ?)
   ON CONFLICT(username) DO UPDATE SET
    password_hash = excluded.password_hash,
    status = 'active',
    enabled = 1,
    updated_at = excluded.updated_at`
).run(hashPassword(password), now, now);

console.log("Admin password hash updated in database.");
