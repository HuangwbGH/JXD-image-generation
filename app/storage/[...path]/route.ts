import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleRoute, jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handleRoute(async () => {
    await requireUser();
    const { path: parts } = await context.params;
    if (parts.some((part) => part === ".." || part.includes("\\"))) return jsonError("路径无效", 400);
    if (parts[0] !== "outputs" && parts[0] !== "uploads") return jsonError("路径无效", 400);
    const relativePath = path.posix.join("storage", ...parts);
    if (!relativePath.startsWith("storage/outputs/") && !relativePath.startsWith("storage/uploads/")) {
      return jsonError("路径无效", 400);
    }
    const buffer = await readFile(relativePath);
    const ext = path.extname(relativePath).toLowerCase();
    const contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600"
      }
    });
  });
}
