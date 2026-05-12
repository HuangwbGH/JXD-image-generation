import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/database";
import { requireAdmin } from "@/lib/auth/session";
import { handleRoute, jsonError } from "@/lib/http";
import { writeLog } from "@/lib/logging/system-log";

const schema = z.object({
  enabled: z.preprocess((value) => value === true || value === "true", z.boolean())
});

async function parseInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return schema.parse(await request.json());
  const form = await request.formData();
  return schema.parse({ enabled: form.get("enabled") });
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
    if (target.username === "admin" && !input.enabled) return wantsJson(request) ? jsonError("不能禁用内置管理员账号", 400) : redirectToUsers();
    if (target.id === admin.id && !input.enabled) return wantsJson(request) ? jsonError("不能禁用当前登录账号", 400) : redirectToUsers();

    const now = new Date().toISOString();
    getDb()
      .prepare("UPDATE users SET enabled = ?, updated_at = ? WHERE id = ?")
      .run(input.enabled ? 1 : 0, now, id);

    if (!input.enabled) {
      getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
    }

    writeLog({
      action: input.enabled ? "admin.user_enable" : "admin.user_disable",
      userId: admin.id,
      username: admin.username,
      targetId: id,
      message: input.enabled ? "管理员启用用户" : "管理员禁用用户",
      metadata: { targetUsername: target.username }
    });

    return wantsJson(request) ? NextResponse.json({ ok: true }) : redirectToUsers();
  });
}
