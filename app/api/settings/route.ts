import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSettings, listDepartments, setDepartmentApiKey, setSetting } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/session";
import { handleRoute } from "@/lib/http";
import { writeLog } from "@/lib/logging/system-log";
import { isRelativePath } from "@/lib/config";

const schema = z.object({
  settings: z.object({
    defaultModel: z.string().min(1),
    allowedModels: z.array(z.string().min(1)),
    proxyEnabled: z.boolean(),
    appHttpProxy: z.string(),
    appHttpsProxy: z.string(),
    uploadMaxImages: z.number().int().min(1).max(14),
    uploadMaxFileSizeMb: z.number().int().min(1).max(100),
    outputDir: z.string().min(1)
  }),
  apiKeys: z.record(z.string(), z.string()).optional()
});

async function parseSettingsInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return schema.parse(await request.json());
  const form = await request.formData();
  const apiKeys: Record<string, string> = {};
  for (const department of listDepartments()) {
    apiKeys[department.id] = String(form.get(`apiKey_${department.id}`) || "");
  }
  return schema.parse({
    settings: {
      defaultModel: form.get("defaultModel"),
      allowedModels: String(form.get("allowedModels") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      proxyEnabled: form.get("proxyEnabled") === "true",
      appHttpProxy: form.get("appHttpProxy") || "",
      appHttpsProxy: form.get("appHttpsProxy") || "",
      uploadMaxImages: Number(form.get("uploadMaxImages") || 8),
      uploadMaxFileSizeMb: Number(form.get("uploadMaxFileSizeMb") || 10),
      outputDir: form.get("outputDir")
    },
    apiKeys
  });
}

function wantsJson(request: Request) {
  return (request.headers.get("content-type") || "").includes("application/json");
}

function redirectToSettings(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    return NextResponse.json({
      settings: getAppSettings(),
      departments: listDepartments()
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const admin = await requireAdmin();
    const input = await parseSettingsInput(request);
    if (!isRelativePath(input.settings.outputDir)) {
      return wantsJson(request)
        ? NextResponse.json({ error: "输出目录必须是相对路径" }, { status: 400 })
        : redirectToSettings(`/settings?error=${encodeURIComponent("输出目录必须是相对路径")}`);
    }
    setSetting("defaultModel", input.settings.defaultModel);
    setSetting("allowedModels", JSON.stringify(input.settings.allowedModels));
    setSetting("proxyEnabled", String(input.settings.proxyEnabled));
    setSetting("appHttpProxy", input.settings.appHttpProxy);
    setSetting("appHttpsProxy", input.settings.appHttpsProxy);
    setSetting("uploadMaxImages", String(input.settings.uploadMaxImages));
    setSetting("uploadMaxFileSizeMb", String(input.settings.uploadMaxFileSizeMb));
    setSetting("outputDir", input.settings.outputDir);

    for (const [departmentId, apiKey] of Object.entries(input.apiKeys || {})) {
      if (apiKey.trim()) setDepartmentApiKey(departmentId, apiKey.trim());
    }

    writeLog({
      action: "settings.update",
      userId: admin.id,
      username: admin.username,
      message: "管理员更新系统设置",
      metadata: {
        defaultModel: input.settings.defaultModel,
        proxyEnabled: input.settings.proxyEnabled,
        apiKeyDepartments: Object.entries(input.apiKeys || {})
          .filter(([, apiKey]) => apiKey.trim())
          .map(([departmentId]) => departmentId)
      }
    });

    return wantsJson(request) ? NextResponse.json({ ok: true }) : redirectToSettings("/settings?saved=1");
  });
}
