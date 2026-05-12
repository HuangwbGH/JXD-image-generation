import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/database";
import { requireUser } from "@/lib/auth/session";
import { deleteRelativeFile } from "@/lib/storage/files";
import { handleRoute, jsonError } from "@/lib/http";
import { writeLog } from "@/lib/logging/system-log";

type StoredFile = { path: string; mimeType: string };

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    return deleteRecord(context, false);
  });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    return deleteRecord(context, true);
  });
}

async function deleteRecord(context: { params: Promise<{ id: string }> }, redirectAfterDelete: boolean) {
  const user = await requireUser();
  const { id } = await context.params;
  const row = getDb().prepare("SELECT * FROM generation_jobs WHERE id = ?").get(id) as
    | {
        id: string;
        user_id: string;
        input_images: string;
        output_images: string;
      }
    | undefined;
  if (!row) {
    return redirectAfterDelete ? new NextResponse(null, { status: 303, headers: { Location: "/records" } }) : jsonError("记录不存在", 404);
  }
  if (user.role !== "admin" && row.user_id !== user.id) {
    return redirectAfterDelete ? new NextResponse(null, { status: 303, headers: { Location: "/records" } }) : jsonError("无权删除该记录", 403);
  }

  const inputImages = JSON.parse(row.input_images) as StoredFile[];
  const outputImages = JSON.parse(row.output_images) as StoredFile[];
  for (const file of [...inputImages, ...outputImages]) {
    await deleteRelativeFile(file.path);
  }
  getDb().prepare("DELETE FROM generation_jobs WHERE id = ?").run(id);
  writeLog({
    action: "records.delete",
    userId: user.id,
    username: user.username,
    targetId: id,
    message: "物理删除生成记录和图片",
    metadata: {
      deletedInputFiles: inputImages.length,
      deletedOutputFiles: outputImages.length
    }
  });
  return redirectAfterDelete ? new NextResponse(null, { status: 303, headers: { Location: "/records" } }) : NextResponse.json({ ok: true });
}
