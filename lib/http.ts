import { NextResponse } from "next/server";
import { writeLog } from "@/lib/logging/system-log";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function handleRoute<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "请求失败";
    writeLog({
      level: "error",
      action: "api.error",
      message,
      metadata: {
        name: error instanceof Error ? error.name : "UnknownError",
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return jsonError(message, 500);
  }
}
