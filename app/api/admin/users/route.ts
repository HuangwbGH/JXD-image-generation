import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/database";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/session";
import { handleRoute, jsonError } from "@/lib/http";
import { listAdminUsers } from "@/lib/admin/users";

const createSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(6),
  displayName: z.string().trim().min(1),
  departmentId: z.enum(["rd_1", "rd_2"]).nullable().optional(),
  role: z.enum(["admin", "user"])
});

async function parseCreateInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return createSchema.parse(await request.json());
  const form = await request.formData();
  return createSchema.parse({
    username: form.get("username"),
    password: form.get("password"),
    displayName: form.get("displayName"),
    role: form.get("role"),
    departmentId: form.get("departmentId") || null
  });
}

function wantsJson(request: Request) {
  return (request.headers.get("content-type") || "").includes("application/json");
}

function redirectToUsers() {
  return new NextResponse(null, { status: 303, headers: { Location: "/users" } });
}

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    return NextResponse.json({ users: listAdminUsers() });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const input = await parseCreateInput(request);
    if (input.role === "user" && !input.departmentId) return jsonError("普通用户必须选择部门", 400);
    const exists = getDb()
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(input.username);
    if (exists) return wantsJson(request) ? jsonError("用户名已存在", 409) : redirectToUsers();

    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO users
          (id, username, display_name, password_hash, role, department_id, status, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)`
      )
      .run(
        randomUUID(),
        input.username,
        input.displayName,
        hashPassword(input.password),
        input.role,
        input.role === "admin" ? null : input.departmentId,
        now,
        now
      );
    return wantsJson(request) ? NextResponse.json({ ok: true }) : redirectToUsers();
  });
}
