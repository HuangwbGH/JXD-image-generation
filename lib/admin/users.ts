import { getDb } from "@/lib/db/database";

export type AdminUserRow = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "user";
  departmentId: string | null;
  departmentName: string | null;
  status: string;
  enabled: number;
  createdAt: string;
  updatedAt: string;
};

export function listAdminUsers() {
  return getDb()
    .prepare(
      `SELECT users.id, users.username, users.display_name as displayName, users.role,
              users.department_id as departmentId, departments.name as departmentName,
              users.status, users.enabled, users.created_at as createdAt, users.updated_at as updatedAt
       FROM users
       LEFT JOIN departments ON departments.id = users.department_id
       ORDER BY CASE users.status WHEN 'pending' THEN 0 ELSE 1 END, users.updated_at DESC`
    )
    .all() as AdminUserRow[];
}
