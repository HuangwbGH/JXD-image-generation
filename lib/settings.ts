import { getDb } from "@/lib/db/database";
import { decrypt, encrypt } from "@/lib/crypto";
import { config } from "@/lib/config";

export type Department = {
  id: string;
  name: string;
  enabled: number;
  hasApiKey: boolean;
};

export type AppSettings = {
  defaultModel: string;
  allowedModels: string[];
  proxyEnabled: boolean;
  appHttpProxy: string;
  appHttpsProxy: string;
  uploadMaxImages: number;
  uploadMaxFileSizeMb: number;
  outputDir: string;
};

export function getSetting(key: string, fallback = "") {
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, value, new Date().toISOString());
}

export function getAppSettings(): AppSettings {
  return {
    defaultModel: getSetting("defaultModel", config.defaultModel),
    allowedModels: JSON.parse(getSetting("allowedModels", JSON.stringify(config.allowedModels))) as string[],
    proxyEnabled: getSetting("proxyEnabled", String(config.proxyEnabled)) === "true",
    appHttpProxy: getSetting("appHttpProxy", config.appHttpProxy),
    appHttpsProxy: getSetting("appHttpsProxy", config.appHttpsProxy),
    uploadMaxImages: Number(getSetting("uploadMaxImages", String(config.uploadMaxImages))),
    uploadMaxFileSizeMb: Number(getSetting("uploadMaxFileSizeMb", String(config.uploadMaxFileSizeMb))),
    outputDir: getSetting("outputDir", config.outputDir)
  };
}

export function listDepartments(): Department[] {
  return getDb()
    .prepare(
      `SELECT id, name, enabled,
              CASE WHEN gemini_api_key_encrypted IS NULL OR gemini_api_key_encrypted = '' THEN 0 ELSE 1 END as hasApiKey
       FROM departments
       ORDER BY id`
    )
    .all() as Department[];
}

export function getDepartmentApiKey(departmentId: string) {
  const row = getDb()
    .prepare("SELECT gemini_api_key_encrypted FROM departments WHERE id = ? AND enabled = 1")
    .get(departmentId) as { gemini_api_key_encrypted: string | null } | undefined;
  return decrypt(row?.gemini_api_key_encrypted ?? null);
}

export function setDepartmentApiKey(departmentId: string, apiKey: string) {
  getDb()
    .prepare("UPDATE departments SET gemini_api_key_encrypted = ?, updated_at = ? WHERE id = ?")
    .run(apiKey ? encrypt(apiKey) : "", new Date().toISOString(), departmentId);
}
