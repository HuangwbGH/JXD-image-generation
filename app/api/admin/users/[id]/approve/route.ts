import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/database";
import { requireAdmin } from "@/lib/auth/session";
import { handleRoute, jsonError } from "@/lib/http";
import { writeLog } from "@/lib/logging/system-log";

const schema = z.object({
  role: z.enum(["admin", "user"]).default("user"),
  departmentId: z.enum(["rd_1", "rd_2"]).nullable()
});

async function parseInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return schema.parse(await request.json());
  const form = await request.formData();
  return schema.parse({
    role: form.get("role") || "user",
    departmentId: form.get("departmentId") || null
  });
}

function wantsJson(request: Request) {
  return (request.headers.get("content-type") || "").includes("application/json");
}

function redirectToUsers() {
  return new NextResponse(null, { status: 303, headers: { Location: "/users" } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const admin = await requireAdmin();
    const input = await parseInput(request);
    if (input.role === "user" && !input.departmentId) return jsonError("普通用户必须选择部门", 400);
    const { id } = await context.params;
    const result = getDb()
      .prepare(
        `UPDATE users
         SET status = 'active', enabled = 1, role = ?, department_id = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ? AND username != 'admin' AND status = 'pending'`
      )
      .run(
        input.role,
        input.role === "admin" ? null : input.departmentId,
        admin.id,
        new Date().toISOString(),
        new Date().toISOString(),
        id
      );
    if (result.changes === 0) return wantsJson(request) ? jsonError("只能审核待审核用户，或用户不存在", 400) : redirectToUsers();
    writeLog({
      action: "admin.user_approve",
      userId: admin.id,
      username: admin.username,
      departmentId: input.departmentId,
      targetId: id,
      message: "管理员审核通过用户",
      metadata: { role: input.role }
    });
    return wantsJson(request) ? NextResponse.json({ ok: true }) : redirectToUsers();
  });
}
