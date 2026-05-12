import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/database";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/session";
import { handleRoute, jsonError } from "@/lib/http";
import { writeLog } from "@/lib/logging/system-log";

const schema = z.object({
  password: z.string().min(6)
});

async function parseInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return schema.parse(await request.json());
  const form = await request.formData();
  return schema.parse({ password: form.get("password") });
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
    const { id } = await context.params;
    const target = getDb()
      .prepare("SELECT id, username FROM users WHERE id = ?")
      .get(id) as { id: string; username: string } | undefined;

    if (!target) return wantsJson(request) ? jsonError("用户不存在", 404) : redirectToUsers();

    getDb()
      .prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
      .run(hashPassword(input.password), new Date().toISOString(), id);
    getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(id);

    writeLog({
      action: "admin.user_reset_password",
      userId: admin.id,
      username: admin.username,
      targetId: id,
      message: "管理员重置用户密码",
      metadata: { targetUsername: target.username }
    });

    return wantsJson(request) ? NextResponse.json({ ok: true }) : redirectToUsers();
  });
}
