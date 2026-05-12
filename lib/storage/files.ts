import { mkdir, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { config, isRelativePath } from "@/lib/config";
import { getAppSettings } from "@/lib/settings";

export type StoredFile = {
  path: string;
  mimeType: string;
};

function ensureRelative(value: string) {
  if (!isRelativePath(value)) throw new Error("路径必须使用相对路径");
  return value;
}

export function toPublicUrl(relativePath: string) {
  return `/${relativePath.replace(/^\.\//, "").replaceAll("\\", "/")}`;
}

export async function saveUpload(file: File, userId: string): Promise<StoredFile> {
  const uploadDir = ensureRelative(config.uploadDir);
  await mkdir(uploadDir, { recursive: true });
  const extension = extensionFromMime(file.type);
  const filename = `${userId}_${timestamp()}_${randomUUID()}.${extension}`;
  const relativePath = path.posix.join(uploadDir.replace(/^\.\//, ""), filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(relativePath, buffer);
  return { path: relativePath, mimeType: file.type };
}

export async function saveGeneratedImage(
  buffer: Buffer,
  outputFormat: "png" | "jpg",
  userId: string,
  index: number
): Promise<StoredFile> {
  const outputDir = ensureRelative(getAppSettings().outputDir);
  await mkdir(outputDir, { recursive: true });
  const fileBase = `${userId}_${timestamp()}${index > 0 ? `_${index}` : ""}`;
  const relativePath = path.posix.join(outputDir.replace(/^\.\//, ""), `${fileBase}.${outputFormat}`);
  const converted =
    outputFormat === "jpg"
      ? await sharp(buffer).jpeg({ quality: 92 }).toBuffer()
      : await sharp(buffer).png().toBuffer();
  await writeFile(relativePath, converted);
  return { path: relativePath, mimeType: outputFormat === "jpg" ? "image/jpeg" : "image/png" };
}

export async function deleteRelativeFile(relativePath: string) {
  if (!relativePath || !isRelativePath(relativePath)) return;
  if (!existsSync(relativePath)) return;
  await unlink(relativePath);
}

export function timestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function extensionFromMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}
