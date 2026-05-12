import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { handleRoute } from "@/lib/http";
import { listSystemLogs } from "@/lib/logging/list-logs";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const url = new URL(request.url);
    const level = url.searchParams.get("level") || "";
    const action = url.searchParams.get("action") || "";
    return NextResponse.json({ logs: listSystemLogs({ level, action }) });
  });
}
