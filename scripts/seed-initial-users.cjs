const Database = require("better-sqlite3");
const { randomBytes, scryptSync } = require("node:crypto");
const { dirname } = require("node:path");
const { mkdirSync } = require("node:fs");

const databaseUrl = process.env.DATABASE_URL || "./storage/app.db";
const initialPassword = process.env.INITIAL_USER_PASSWORD || "666666";

const users = [
  { username: "hongyf", displayName: "洪雅菲", departmentId: "rd_2" },
  { username: "chenyz", displayName: "陈玉真", departmentId: "rd_2" },
  { username: "yuyq", displayName: "余燕琴", departmentId: "rd_2" },
  { username: "fucs", displayName: "符春生", departmentId: "rd_2" },
  { username: "yangyr", displayName: "杨艺蓉", departmentId: "rd_2" },
  { username: "qiuyn", displayName: "邱艺能", departmentId: "rd_2" },
  { username: "yangcg", displayName: "杨长根", departmentId: "rd_2" },
  { username: "yexf", displayName: "叶晓峰", departmentId: "rd_2" },
  { username: "zengjl", displayName: "曾俊龙", departmentId: "rd_1" },
  { username: "zhoush", displayName: "周绍辉", departmentId: "rd_1" },
  { username: "yen", displayName: "叶农", departmentId: "rd_1" },
  { username: "fangyf", displayName: "方云凤", departmentId: "rd_1" },
  { username: "chenyt", displayName: "陈跃腾", departmentId: "rd_1" },
  { username: "huangxz", displayName: "黄祥智", departmentId: "rd_1" }
];

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

mkdirSync(dirname(databaseUrl), { recursive: true });
const db = new Database(databaseUrl);
const now = new Date().toISOString();

db.exec(`
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
`);

const departmentStmt = db.prepare(`
  INSERT OR IGNORE INTO departments (id, name, enabled, created_at, updated_at)
  VALUES (?, ?, 1, ?, ?)
`);
departmentStmt.run("rd_1", "研发一部", now, now);
departmentStmt.run("rd_2", "研发二部", now, now);

const userStmt = db.prepare(`
  INSERT INTO users
    (id, username, display_name, password_hash, role, department_id, status, enabled, reviewed_by, reviewed_at, created_at, updated_at)
  VALUES
    (?, ?, ?, ?, 'user', ?, 'active', 1, 'admin', ?, ?, ?)
  ON CONFLICT(username) DO UPDATE SET
    display_name = excluded.display_name,
    password_hash = excluded.password_hash,
    role = 'user',
    department_id = excluded.department_id,
    status = 'active',
    enabled = 1,
    reviewed_by = 'admin',
    reviewed_at = excluded.reviewed_at,
    updated_at = excluded.updated_at
`);

const insertMany = db.transaction(() => {
  for (const user of users) {
    userStmt.run(user.username, user.username, user.displayName, hashPassword(initialPassword), user.departmentId, now, now, now);
  }
});

insertMany();
db.close();

console.log(`Seeded ${users.length} initial users with password ${initialPassword}.`);
