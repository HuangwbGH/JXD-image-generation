import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/database";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { handleRoute, jsonError } from "@/lib/http";
import { writeLog } from "@/lib/logging/system-log";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

async function parseLoginInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return schema.parse(await request.json());
  const form = await request.formData();
  return schema.parse({
    username: form.get("username"),
    password: form.get("password")
  });
}

function wantsJson(request: Request) {
  return (request.headers.get("content-type") || "").includes("application/json");
}

function loginRedirect(request: Request, path: string) {
  void request;
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path }
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const input = await parseLoginInput(request);
    const user = getDb()
      .prepare(
        "SELECT id, password_hash, status, enabled FROM users WHERE username = ?"
      )
      .get(input.username) as
      | { id: string; password_hash: string; status: string; enabled: number }
      | undefined;

    if (!user || !user.enabled || user.status !== "active") {
      writeLog({
        level: "warn",
        action: "auth.login_failed",
        username: input.username,
        message: "登录失败：账号不存在或尚未审核"
      });
      if (!wantsJson(request)) return loginRedirect(request, "/login?error=account");
      return jsonError("账号不存在或尚未审核通过", 401);
    }

    if (!verifyPassword(input.password, user.password_hash)) {
      writeLog({
        level: "warn",
        action: "auth.login_failed",
        userId: user.id,
        username: input.username,
        message: "登录失败：密码错误"
      });
      if (!wantsJson(request)) return loginRedirect(request, "/login?error=password");
      return jsonError("用户名或密码错误", 401);
    }

    await createSession(user.id);
    writeLog({
      action: "auth.login",
      userId: user.id,
      username: input.username,
      message: "用户登录成功"
    });
    if (!wantsJson(request)) return loginRedirect(request, "/");
    return NextResponse.json({ ok: true });
  });
}
