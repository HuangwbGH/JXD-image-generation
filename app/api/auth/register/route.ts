import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db/database";
import { hashPassword } from "@/lib/auth/password";
import { handleRoute, jsonError } from "@/lib/http";
import { writeLog } from "@/lib/logging/system-log";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(6),
  displayName: z.string().trim().min(1),
  departmentId: z.enum(["rd_1", "rd_2"])
});

async function parseRegisterInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return schema.parse(await request.json());
  const form = await request.formData();
  return schema.parse({
    username: form.get("username"),
    password: form.get("password"),
    displayName: form.get("displayName"),
    departmentId: form.get("departmentId")
  });
}

function wantsJson(request: Request) {
  return (request.headers.get("content-type") || "").includes("application/json");
}

function registerRedirect(request: Request, path: string) {
  void request;
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path }
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const input = await parseRegisterInput(request);
    const db = getDb();
    const existing = db
      .prepare("SELECT id, status FROM users WHERE username = ?")
      .get(input.username) as { id: string; status: string } | undefined;

    const now = new Date().toISOString();
    if (existing?.status === "pending") {
      writeLog({
        level: "warn",
        action: "auth.register_rejected",
        username: input.username,
        departmentId: input.departmentId,
        message: "注册失败：用户名正在审核"
      });
      if (!wantsJson(request)) return registerRedirect(request, "/register?error=pending");
      return jsonError("该用户名已提交注册，请等待管理员审核", 409);
    }

    if (existing && existing.status !== "rejected") {
      writeLog({
        level: "warn",
        action: "auth.register_rejected",
        username: input.username,
        departmentId: input.departmentId,
        message: "注册失败：用户名已存在"
      });
      if (!wantsJson(request)) return registerRedirect(request, "/register?error=exists");
      return jsonError("该用户名已存在，请更换用户名", 409);
    }

    if (existing?.status === "rejected") {
      db.prepare(
        `UPDATE users
         SET display_name = ?, password_hash = ?, department_id = ?, status = 'pending',
             role = 'user', enabled = 1, reviewed_by = NULL, reviewed_at = NULL, updated_at = ?
         WHERE id = ?`
      ).run(input.displayName, hashPassword(input.password), input.departmentId, now, existing.id);
      writeLog({
        action: "auth.register_resubmitted",
        userId: existing.id,
        username: input.username,
        departmentId: input.departmentId,
        message: "用户重新提交注册"
      });
    } else {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO users
          (id, username, display_name, password_hash, role, department_id, status, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'user', ?, 'pending', 1, ?, ?)`
      ).run(
        id,
        input.username,
        input.displayName,
        hashPassword(input.password),
        input.departmentId,
        now,
        now
      );
      writeLog({
        action: "auth.register",
        userId: id,
        username: input.username,
        departmentId: input.departmentId,
        message: "用户提交注册"
      });
    }

    if (!wantsJson(request)) return registerRedirect(request, "/login?registered=1");
    return NextResponse.json({ ok: true });
  });
}
