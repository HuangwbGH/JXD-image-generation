import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/database";
import { requireAdmin } from "@/lib/auth/session";
import { handleRoute, jsonError } from "@/lib/http";
import { writeLog } from "@/lib/logging/system-log";

function wantsJson(request: Request) {
  return (request.headers.get("content-type") || "").includes("application/json");
}

function redirectToUsers() {
  return new NextResponse(null, { status: 303, headers: { Location: "/users" } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const now = new Date().toISOString();
    const result = getDb()
      .prepare(
        `UPDATE users
         SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ? AND username != 'admin' AND status = 'pending'`
      )
      .run(admin.id, now, now, id);
    if (result.changes === 0) return wantsJson(request) ? jsonError("只能拒绝待审核用户，或用户不存在", 400) : redirectToUsers();
    writeLog({
      action: "admin.user_reject",
      userId: admin.id,
      username: admin.username,
      targetId: id,
      message: "管理员拒绝用户注册"
    });
    return wantsJson(request) ? NextResponse.json({ ok: true }) : redirectToUsers();
  });
}
