import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handleRoute } from "@/lib/http";
import { listGenerationRecords } from "@/lib/records";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    return NextResponse.json({ records: listGenerationRecords(user) });
  });
}
