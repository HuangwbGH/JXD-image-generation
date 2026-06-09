# 配置说明

## 目录

- [用途](#用途)
- [配置来源](#配置来源)
- [环境变量](#环境变量)
- [设置页配置](#设置页配置)
- [敏感配置](#敏感配置)
- [代理配置](#代理配置)
- [已知差异](#已知差异)

## 用途

本文档说明项目可配置项、默认值、维护入口和安全要求。

## 配置来源

启动默认值来自 `.env` 和 `lib/config.ts`。运行时设置保存在 SQLite `app_settings`，由 `lib/settings.ts` 读取；设置页保存后的值优先于 `.env` 默认值。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `APP_BASE_URL` | `http://localhost:32179` | 应用访问地址，用于部署说明和外部访问配置。 |
| `PORT` | `32179` | Next.js 监听端口。 |
| `AUTH_SECRET` | `change-this-secret` 示例值 | 会话与 API Key 加密密钥来源，生产必须替换。 |
| `SESSION_TTL_DAYS` | `7` | 登录会话有效期。 |
| `DATABASE_URL` | `./storage/app.db` | SQLite 数据库路径。 |
| `OUTPUT_DIR` | `./storage/outputs` | 生成图片输出目录。 |
| `UPLOAD_DIR` | `./storage/uploads` | 上传图片缓存目录。 |
| `GEMINI_DEFAULT_MODEL` | `gemini-3.1-flash-image-preview` | 默认模型。 |
| `GEMINI_ALLOWED_MODELS` | 见 `.env.example` | 可选模型白名单，逗号分隔。 |
| `PROXY_ENABLED` | `true` 示例值 | 是否启用程序级代理。 |
| `APP_HTTP_PROXY` | 空或示例代理 | HTTP 代理。 |
| `APP_HTTPS_PROXY` | 空或示例代理 | HTTPS 代理。 |
| `UPLOAD_MAX_IMAGES` | `8` | 单次最多上传图片数。 |
| `UPLOAD_MAX_FILE_SIZE_MB` | `10` | 单张图片最大 MB。 |
| `UPLOAD_ALLOWED_MIME_TYPES` | `image/png,image/jpeg,image/webp` | 允许上传 MIME 类型。 |
| `GENERATION_MAX_CONCURRENCY` | `3` | 生成并发上限。 |
| `GENERATION_TIMEOUT_SECONDS` | `120` | 生成超时配置，当前实现仍有差异。 |

## 设置页配置

管理员可在设置页维护：

- 默认模型。
- 允许模型列表。
- 是否启用程序级代理。
- HTTP/HTTPS 代理地址。
- 输出目录。
- 最大上传图片数。
- 单图大小限制。
- 研发一部、研发二部 Gemini API Key。

## 敏感配置

- Gemini API Key 不写入 `.env`，只通过设置页维护。
- API Key 使用 AES-GCM 加密后写入 `departments.gemini_api_key_encrypted`。
- 加密密钥由 `AUTH_SECRET` 派生。
- 迁移或恢复时必须同时保留 `./storage/app.db` 和原 `AUTH_SECRET`。

## 代理配置

可用代理由用户或运维确认后写入 `.env` 或设置页，例如：

```env
PROXY_ENABLED=true
APP_HTTP_PROXY=http://代理地址:端口
APP_HTTPS_PROXY=http://代理地址:端口
```

## 已知差异

- `UPLOAD_ALLOWED_MIME_TYPES` 存在于 `.env` 与 `lib/config.ts`，但生成接口当前使用固定 MIME 列表校验。
- `GENERATION_TIMEOUT_SECONDS` 存在于配置中，但 Gemini 请求当前固定使用 120 秒超时。
- `docker-compose.yml` 当前端口映射固定为 `32179:32179`。
