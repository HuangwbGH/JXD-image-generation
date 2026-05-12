import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/database";

export async function GET() {
  getDb().prepare("SELECT 1").get();
  return NextResponse.json({ ok: true });
}
