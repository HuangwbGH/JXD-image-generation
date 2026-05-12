import { getDb } from "@/lib/db/database";

export type SystemLogRow = {
  id: string;
  level: string;
  action: string;
  userId: string | null;
  username: string | null;
  departmentId: string | null;
  targetId: string | null;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function parseMetadata(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { parseError: true, raw: value };
  }
}

export function listSystemLogs({ level = "", action = "" }: { level?: string; action?: string } = {}) {
  const params: string[] = [];
  const filters = [];

  if (level) {
    filters.push("level = ?");
    params.push(level);
  }
  if (action) {
    filters.push("action LIKE ?");
    params.push(`%${action}%`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT id, level, action, user_id as userId, username, department_id as departmentId,
              target_id as targetId, message, metadata, created_at as createdAt
       FROM system_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT 300`
    )
    .all(...params)
    .map((row) => {
      const item = row as Omit<SystemLogRow, "metadata"> & { metadata: string | null };
      return {
        ...item,
        metadata: parseMetadata(item.metadata)
      };
    });
}
