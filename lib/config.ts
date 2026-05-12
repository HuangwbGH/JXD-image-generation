export const config = {
  authSecret: process.env.AUTH_SECRET || "dev-secret-change-me",
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS || 7),
  databaseUrl: process.env.DATABASE_URL || "./storage/app.db",
  outputDir: process.env.OUTPUT_DIR || "./storage/outputs",
  uploadDir: process.env.UPLOAD_DIR || "./storage/uploads",
  defaultModel: process.env.GEMINI_DEFAULT_MODEL || "gemini-3.1-flash-image-preview",
  allowedModels: (process.env.GEMINI_ALLOWED_MODELS ||
    "gemini-3.1-flash-image-preview,gemini-3-pro-image-preview,gemini-2.5-flash-image")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  proxyEnabled: process.env.PROXY_ENABLED === "true",
  appHttpProxy: process.env.APP_HTTP_PROXY || "",
  appHttpsProxy: process.env.APP_HTTPS_PROXY || "",
  uploadMaxImages: Number(process.env.UPLOAD_MAX_IMAGES || 8),
  uploadMaxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 10),
  uploadAllowedMimeTypes: (process.env.UPLOAD_ALLOWED_MIME_TYPES || "image/png,image/jpeg,image/webp")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  generationMaxConcurrency: Number(process.env.GENERATION_MAX_CONCURRENCY || 3),
  generationTimeoutSeconds: Number(process.env.GENERATION_TIMEOUT_SECONDS || 120)
};

export function isRelativePath(value: string) {
  return value.startsWith("./") || (!value.startsWith("/") && !/^[a-zA-Z]:[\\/]/.test(value));
}
