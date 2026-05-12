import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/database";

type LogInput = {
  level?: "info" | "warn" | "error";
  action: string;
  userId?: string | null;
  username?: string | null;
  departmentId?: string | null;
  targetId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
};

export function writeLog(input: LogInput) {
  getDb()
    .prepare(
      `INSERT INTO system_logs
        (id, level, action, user_id, username, department_id, target_id, message, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      input.level || "info",
      input.action,
      input.userId || null,
      input.username || null,
      input.departmentId || null,
      input.targetId || null,
      input.message,
      JSON.stringify(input.metadata || {}),
      new Date().toISOString()
    );
}
