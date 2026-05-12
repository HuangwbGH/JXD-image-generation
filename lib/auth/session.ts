import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/database";
import { config } from "@/lib/config";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "user";
  departmentId: string | null;
  departmentName: string | null;
};

const cookieName = "jxd_session";

export async function createSession(userId: string) {
  const id = randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(id, userId, expires.toISOString(), now.toISOString());

  const cookieStore = await cookies();
  cookieStore.set(cookieName, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const id = cookieStore.get(cookieName)?.value;
  if (id) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
  cookieStore.delete(cookieName);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(cookieName)?.value;
  if (!id) return null;

  const row = getDb()
    .prepare(
      `SELECT users.id, users.username, users.display_name as displayName, users.role,
              users.department_id as departmentId, departments.name as departmentName,
              sessions.expires_at as expiresAt
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       LEFT JOIN departments ON departments.id = users.department_id
       WHERE sessions.id = ? AND users.enabled = 1 AND users.status = 'active'`
    )
    .get(id) as (CurrentUser & { expiresAt: string }) | undefined;

  if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    departmentId: row.departmentId,
    departmentName: row.departmentName
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Response("Forbidden", { status: 403 });
  return user;
}
