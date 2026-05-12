import { getDb } from "@/lib/db/database";
import type { CurrentUser } from "@/lib/auth/session";
import { toPublicUrl } from "@/lib/storage/files";

type StoredFile = { path: string; mimeType: string };

export type GenerationRecord = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  departmentId: string;
  departmentName: string;
  mode: string;
  model: string;
  prompt: string;
  aspectRatio: string;
  imageSize: string;
  outputFormat: string;
  status: string;
  durationMs: number;
  createdAt: string;
  images: Array<{ url: string; mimeType: string }>;
};

function parseStoredFiles(value: unknown) {
  try {
    return JSON.parse(String(value || "[]")) as StoredFile[];
  } catch {
    return [];
  }
}

export function listGenerationRecords(user: CurrentUser) {
  const sql =
    user.role === "admin"
      ? `SELECT generation_jobs.*, users.username, users.display_name as displayName, departments.name as departmentName
         FROM generation_jobs
         JOIN users ON users.id = generation_jobs.user_id
         LEFT JOIN departments ON departments.id = generation_jobs.department_id
         ORDER BY generation_jobs.created_at DESC
         LIMIT 200`
      : `SELECT generation_jobs.*, users.username, users.display_name as displayName, departments.name as departmentName
         FROM generation_jobs
         JOIN users ON users.id = generation_jobs.user_id
         LEFT JOIN departments ON departments.id = generation_jobs.department_id
         WHERE generation_jobs.user_id = ?
         ORDER BY generation_jobs.created_at DESC
         LIMIT 200`;
  const rows = user.role === "admin" ? getDb().prepare(sql).all() : getDb().prepare(sql).all(user.id);
  return rows.map((row) => {
    const item = row as Record<string, string | number | null>;
    const outputImages = parseStoredFiles(item.output_images);
    return {
      id: String(item.id),
      userId: String(item.user_id),
      username: String(item.username || ""),
      displayName: String(item.displayName || item.username || ""),
      departmentId: String(item.department_id || ""),
      departmentName: String(item.departmentName || item.department_id || "-"),
      mode: String(item.mode || ""),
      model: String(item.model || ""),
      prompt: String(item.prompt || ""),
      aspectRatio: String(item.aspect_ratio || ""),
      imageSize: String(item.image_size || ""),
      outputFormat: String(item.output_format || ""),
      status: String(item.status || ""),
      durationMs: Number(item.duration_ms || 0),
      createdAt: String(item.created_at || ""),
      images: outputImages.map((image) => ({
        url: toPublicUrl(image.path),
        mimeType: image.mimeType
      }))
    } satisfies GenerationRecord;
  });
}
