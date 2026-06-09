# JXD Gemini 生图工具

## 目录

- [项目简介](#项目简介)
- [功能模块](#功能模块)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [环境要求](#环境要求)
- [本地开发](#本地开发)
- [Docker 部署](#docker-部署)
- [首次初始化](#首次初始化)
- [配置维护](#配置维护)
- [数据与备份](#数据与备份)
- [验证命令](#验证命令)
- [文档入口](#文档入口)
- [当前限制](#当前限制)

## 项目简介

本项目是公司内部使用的 Gemini 生图网站，提供账号登录、用户注册审核、文生图、图生图、部门级 Gemini API Key、程序级代理、生成记录、系统日志和 Docker 部署能力。

服务默认监听 `32179`，端口、存储路径、代理、上传限制和生成并发均通过 `.env` 或设置页维护。

## 功能模块

- 登录与注册：本地账号密码登录；普通用户自助注册后需管理员审核。
- 用户与部门：内置 `研发一部`、`研发二部`；管理员可以创建、审核、启停用户并重置密码。
- 生图：支持 `文生图` 和 `图生图`，支持多图上传、提示词、模型、分辨率、比例和输出格式。
- 部门 API Key：每个部门独立配置 Gemini API Key，普通用户按所属部门自动使用对应 Key。
- 程序级代理：只影响本程序访问 Gemini，不修改服务器全局代理。
- 记录与日志：保存生成记录，支持物理删除；管理员可查看系统日志。
- 文件访问：输出图和上传图通过受登录态保护的 `/storage/...` 路由访问。

## 技术栈

- Next.js App Router、React、TypeScript。
- SQLite，默认数据库为 `./storage/app.db`。
- 本地文件存储，默认目录为 `./storage/uploads` 与 `./storage/outputs`。
- Gemini REST `generateContent`，通过 `undici` 注入代理。
- `sharp` 用于输出图片格式转换。
- 密码使用 Node `scrypt` 哈希。
- 部门 API Key 使用 AES-GCM 加密，密钥由 `AUTH_SECRET` 派生。

## 目录结构

- `app/`：页面和 API Routes。
- `lib/`：认证、配置、数据库、Gemini、记录、日志、文件存储等服务端逻辑。
- `scripts/`：管理员密码和初始用户维护脚本。
- `docs/`：产品、架构、配置、部署、数据库、测试和过程文档。
- `storage/`：运行时数据库、上传文件和输出图片；部署时必须持久化。
- `Dockerfile`、`docker-compose.yml`：镜像构建与容器编排。
- `.env.example`：环境变量示例，不包含真实密钥。

## 环境要求

本地开发：

- Node.js 22 或更高版本。
- npm。

Linux 部署：

- Docker。
- Docker Compose v2。
- 服务器能通过公司网络或代理访问 Gemini。
- 局域网放通 `32179/tcp` 或 `.env` 中配置的端口。

## 本地开发

```bash
npm install
cp .env.example .env
npm run admin:set-password -- '替换为管理员密码'
npm run users:seed-initial
npm run dev
```

打开 `http://localhost:32179`。管理员账号固定为 `admin`。

## Docker 部署

```bash
cp .env.example .env
mkdir -p storage/uploads storage/outputs
docker compose up -d --build
```

生产环境必须修改 `.env`：

```env
APP_BASE_URL=http://服务器局域网IP:32179
PORT=32179
AUTH_SECRET=替换为至少32位随机字符串
PROXY_ENABLED=true
APP_HTTP_PROXY=http://代理地址:端口
APP_HTTPS_PROXY=http://代理地址:端口
```

说明：

- `docker-compose.yml` 当前将宿主机 `32179` 映射到容器 `32179`，端口参数化已记录在 `docs/ProcessTodo.md`。
- 不要把真实 Gemini API Key 写入 `.env`；请登录管理员设置页维护。

## 首次初始化

1. 设置 `.env` 中的 `AUTH_SECRET`，并长期保留。
2. 执行 `npm run admin:set-password -- '替换为管理员密码'`。
3. 执行 `npm run users:seed-initial` 初始化普通用户，或让用户自助注册后由管理员审核。
4. 使用 `admin` 登录。
5. 在设置页为 `研发一部`、`研发二部` 配置 Gemini API Key。
6. 根据网络情况配置程序级 HTTP/HTTPS 代理。
7. 执行一次文生图或图生图验证完整链路。

## 配置维护

`.env` 提供启动默认值，设置页保存的值写入 SQLite `app_settings`，运行时优先读取数据库设置。

关键配置：

- `AUTH_SECRET`：会话和 API Key 加密依赖。更换后，已保存 API Key 需要重新配置。
- `DATABASE_URL`：默认 `./storage/app.db`。
- `OUTPUT_DIR`、`UPLOAD_DIR`：必须使用相对路径。
- `GEMINI_ALLOWED_MODELS`：逗号分隔的模型白名单。
- `PROXY_ENABLED`、`APP_HTTP_PROXY`、`APP_HTTPS_PROXY`：程序级代理。
- `GENERATION_MAX_CONCURRENCY`：生成并发上限。
- `GENERATION_TIMEOUT_SECONDS`：生成超时时间配置；当前 Gemini 调用实现中仍使用 120 秒固定超时，已列入待办。

## 数据与备份

必须备份：

- `./storage/app.db`
- `./storage/uploads`
- `./storage/outputs`
- `.env` 中的 `AUTH_SECRET`

部门 API Key 的加密值保存在 `departments.gemini_api_key_encrypted`。迁移服务器时，如果数据库与 `AUTH_SECRET` 不匹配，已保存 API Key 无法解密。

## 验证命令

```bash
npm run lint
npm run typecheck
npm run build
curl -i http://127.0.0.1:32179/api/health
docker compose config
docker compose ps
docker compose logs --tail=100 image-generator
```

## 文档入口

- `AGENTS.md`：AI 编程和协作规范。
- `PRD.md`：根目录产品需求入口。
- `docs/Index.md`：文档总索引。
- `docs/ProcessTodo.md`：任务过程、待办、阻塞项和需用户配置项。
- `docs/Config.md`：配置说明。
- `docs/Deployment.md`：部署说明。
- `docs/DatabaseSchema.md`：数据库结构。
- `docs/TestReport.md`：测试与验收记录。

## 当前限制

- `docker-compose.yml` 端口映射仍写死为 `32179:32179`。
- `GENERATION_TIMEOUT_SECONDS` 配置尚未接入 Gemini 请求超时实现。
- 当前没有自动化单元测试或端到端测试，主要依赖 lint、typecheck、build 和人工链路验证。
