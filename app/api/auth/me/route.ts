import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { handleRoute } from "@/lib/http";

export async function GET() {
  return handleRoute(async () => {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  });
}
