# 配置与部署指南

## 目录

- [环境变量](#环境变量)
- [设置页字段](#设置页字段)
- [Docker Compose 草案](#docker-compose-草案)
- [部署步骤](#部署步骤)
- [运维检查](#运维检查)
- [配置安全](#配置安全)
- [开发约束](#开发约束)

## 环境变量

建议提供 `.env.example`：

```env
APP_BASE_URL=http://localhost:32179
PORT=32179
AUTH_SECRET=
SESSION_TTL_DAYS=7
# 管理员账号名固定为 admin；管理员密码哈希由运维在数据库中维护。

GEMINI_DEFAULT_MODEL=gemini-3.1-flash-image-preview
GEMINI_ALLOWED_MODELS=gemini-3.1-flash-image-preview,gemini-3-pro-image-preview,gemini-2.5-flash-image
GEMINI_DEFAULT_DEPARTMENT=

PROXY_ENABLED=false
APP_HTTP_PROXY=
APP_HTTPS_PROXY=

UPLOAD_MAX_IMAGES=8
UPLOAD_MAX_FILE_SIZE_MB=10
UPLOAD_ALLOWED_MIME_TYPES=image/png,image/jpeg,image/webp

OUTPUT_DIR=./storage/outputs
UPLOAD_DIR=./storage/uploads
DATABASE_URL=./storage/app.db

GENERATION_MAX_CONCURRENCY=3
GENERATION_TIMEOUT_SECONDS=120
```

如果需要默认走公司代理：

```env
PROXY_ENABLED=true
APP_HTTP_PROXY=http://代理地址:端口
APP_HTTPS_PROXY=http://代理地址:端口
```

注意：代理配置必须只作用于本程序访问 Gemini 的请求，不要求也不建议把整台服务器配置为全局代理。实现时应在 Gemini 客户端底层 fetch/dispatcher 注入代理配置，避免影响服务器其他进程。

所有路径配置必须使用相对路径，例如 `./storage/outputs`，不要写入具体服务器绝对路径。

## 设置页字段

| 字段 | 类型 | 是否敏感 | 说明 |
| --- | --- | --- | --- |
| `users` | table | 否 | 用户账号、角色、所属部门、审核状态 |
| `departments` | table | 否 | 部门列表 |
| `departmentGeminiApiKey` | password | 是 | 每个部门独立配置，保存后只显示掩码 |
| `defaultModel` | select | 否 | 默认模型 |
| `allowedModels` | multi-select | 否 | 允许用户选择的模型 |
| `proxyEnabled` | switch | 否 | 是否启用代理 |
| `appHttpProxy` | text | 是 | 本程序访问 Gemini 时使用的 HTTP 代理 |
| `appHttpsProxy` | text | 是 | 本程序访问 Gemini 时使用的 HTTPS 代理 |
| `uploadMaxImages` | number | 否 | 最多上传图片数 |
| `uploadMaxFileSizeMb` | number | 否 | 单图大小限制 |
| `outputDir` | text | 否 | 服务端输出目录 |

## Docker Compose 草案

部署目标为 Docker，需支持在 Linux OS 上运行。

```yaml
services:
  image-generator:
    build: .
    ports:
      - "32179:32179"
    env_file:
      - .env
    environment:
      PORT: "32179"
      HOSTNAME: "0.0.0.0"
    volumes:
      - ./storage:容器内运行数据目录
    restart: unless-stopped
```

当前实现使用 SQLite；如未来切换 PostgreSQL，需要新增数据库适配层和迁移脚本。

## 部署步骤

1. 准备服务器，确保服务进程可连接公司代理。
2. 配置 `.env`，设置默认模型、数据库和输出目录。
3. 设置 `PROXY_ENABLED=true`，并配置 `APP_HTTP_PROXY`、`APP_HTTPS_PROXY`。
4. 创建 `storage/outputs` 目录，确保服务进程可写。
5. 启动服务：`docker compose up -d --build`。
6. 设置固定管理员账号 `admin` 的密码：`docker compose exec image-generator node scripts/set-admin-password.cjs '新密码'`。
7. 使用管理员账号 `admin` 登录。
8. 在用户管理页审核自助注册用户，维护研发一部、研发二部用户；在设置页为每个部门填入 Gemini API Key。
9. 点击连通性测试。
10. 用文生图和图生图各跑一次验收。

## 运维检查

- `GET /api/health`：服务存活。
- `POST /api/settings/test`：Gemini 和代理连通性。
- 日志：记录任务 ID、用户、部门、耗时、模型、错误摘要，不记录 API Key 和密码。
- 生成图片默认永久保存；用户和管理员可按权限手动物理删除图片文件和数据库记录。
- 输出文件命名规则：`用户ID+年月日时分秒`。

## 配置安全

- 部门 API Key 只保存在服务端。
- 用户密码或登录凭据只保存哈希，不保存明文。
- `.env` 不提交 Git。
- 设置页保存敏感配置时需要服务端加密，密钥来自部署环境变量。
- 反向代理层建议限制只能内网访问。
- Linux 防火墙需要放行 `32179/tcp`，或只允许公司局域网网段访问。

## 开发约束

- 开发必须遵循根目录 `AGENTS.md`。
- Dockerfile 和 Compose 配置应面向 Linux OS。
- 所有挂载、数据库和输出目录示例使用相对路径。
