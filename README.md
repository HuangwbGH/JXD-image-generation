# JXD Gemini 生图工具

公司内部使用的 Gemini 生图网站，支持本地账号登录、研发一部/研发二部门户、文生图、图生图、按部门配置 Gemini API Key、程序级 HTTP/HTTPS 代理、生成记录、系统日志和 Docker 部署。

## 目录

- [功能模块](#功能模块)
- [技术实现](#技术实现)
- [API Key 存放位置](#api-key-存放位置)
- [项目目录](#项目目录)
- [环境要求](#环境要求)
- [本地开发运行](#本地开发运行)
- [Linux 局域网 Docker 部署](#linux-局域网-docker-部署)
- [首次初始化](#首次初始化)
- [基本使用流程](#基本使用流程)
- [维护方法](#维护方法)
- [更新发布](#更新发布)
- [备份与恢复](#备份与恢复)
- [验证命令](#验证命令)
- [部署注意事项检查清单](#部署注意事项检查清单)
- [常见问题排查](#常见问题排查)
- [当前限制](#当前限制)

## 功能模块

- 登录与注册：本地账号密码登录，自助注册后由管理员审核。
- 用户与部门：内置 `研发一部`、`研发二部`，普通用户绑定部门，管理员可创建、审核、禁用、启用用户并重置密码。
- Gemini 配置：每个部门独立配置 API Key，API Key 只保存在服务端。
- 程序级代理：只让本程序访问 Gemini 时走代理，不影响服务器全局网络。
- 生图：支持文生图、图生图、模型、分辨率、输出格式、横纵比、提示词。
- 发送预览：生图页面底部展示即将发送给后端的具体参数。
- 生成记录：支持列表模式和详情模式；普通用户只看自己的记录，管理员看全部。
- 物理删除：删除记录时同步删除输出图、上传缓存和数据库记录。
- 系统日志：管理员查看登录、注册、审核、设置、生成请求、生成响应、错误和删除日志。
- 文件访问：图片通过受登录态保护的 `/storage/outputs/...` 和 `/storage/uploads/...` 路由访问。

## 技术实现

- 框架：Next.js App Router + React + TypeScript。
- 样式：普通 CSS，位于 `app/globals.css`。
- 数据库：SQLite，默认 `./storage/app.db`。
- 文件存储：本地相对路径，默认 `./storage/uploads` 和 `./storage/outputs`。
- Gemini：服务端使用 REST `generateContent` 接口，`undici` 注入代理。
- 图片转换：`sharp` 用于保存 PNG/JPG。
- 密码：Node `scrypt` 哈希，不保存明文。
- 敏感配置：部门 API Key 使用 AES-GCM 加密，密钥来自 `AUTH_SECRET`。
- 部署：Docker / Docker Compose，默认端口 `32179`。

## API Key 存放位置

Gemini API Key 不写在前端代码里，也不写在 `.env` 文件里。管理员在 `设置` 页面为研发一部、研发二部填写 API Key 后，程序会在服务端加密保存到 SQLite 数据库。

实际存放位置：

```text
./storage/app.db
```

数据库表和字段：

```text
departments.gemini_api_key_encrypted
```

加密方式：

- 保存时通过 AES-256-GCM 加密。
- 加密密钥由 `.env` 中的 `AUTH_SECRET` 经过 SHA-256 派生。
- 数据库中不会保存明文 API Key。
- 设置页只显示 `已配置` 或 `未配置`，不会回显明文 API Key。

运维注意：

- 备份 API Key 时，需要一起备份 `./storage/app.db` 和当前 `.env` 中的 `AUTH_SECRET`。
- 如果更换或丢失 `AUTH_SECRET`，数据库里已经保存的 API Key 将无法解密，需要管理员重新在设置页填写。
- 迁移服务器时，必须同时迁移 `storage` 目录和 `.env`，否则部门 API Key 会失效。
- 不要直接手工编辑 `departments.gemini_api_key_encrypted`，应通过管理员设置页维护 API Key。

## 项目目录

- `app/`：页面和 API Routes。
- `lib/auth/`：登录会话、密码哈希。
- `lib/db/`：SQLite 初始化和迁移。
- `lib/gemini/`：Gemini REST 调用。
- `lib/storage/`：文件保存、路径转换、物理删除。
- `lib/logging/`：系统日志写入。
- `scripts/`：维护脚本。
- `docs/`：PRD、架构、部署和实施文档。
- `storage/`：运行时数据库、上传文件和输出图片。部署时必须持久化；部门 API Key 的加密值也保存在 `storage/app.db` 中。

## 环境要求

本地开发：

- Node.js 22 或更高版本。
- npm。

Linux 服务器部署：

- Linux 服务器一台，局域网用户可以访问该服务器 IP。
- Docker。
- Docker Compose v2。
- 服务器可以通过公司代理访问 Gemini。
- 防火墙允许公司局域网访问 `32179/tcp`。

检查服务器环境：

```bash
docker --version
docker compose version
```

如果服务器未安装 Docker，需要先由运维按公司标准安装 Docker 和 Docker Compose v2。

## 本地开发运行

1. 进入项目目录：

```bash
cd /path/to/JXD-image-generation
```

2. 安装依赖：

```bash
npm install
```

3. 准备环境变量：

```bash
cp .env.example .env
```

4. 修改 `.env`。本地开发至少需要替换：

```env
AUTH_SECRET=请替换为足够长的随机字符串
APP_BASE_URL=http://localhost:32179
```

5. 初始化管理员密码。管理员账号固定为 `admin`：

```bash
npm run admin:set-password -- '你的管理员密码'
```

6. 初始化内置普通用户。默认初始密码为 `666666`：

```bash
npm run users:seed-initial
```

7. 启动开发服务：

```bash
npm run dev
```

8. 打开：

```text
http://localhost:32179
```

## Linux 局域网 Docker 部署

以下命令假设程序部署到服务器目录 `/opt/jxd-image-generation`。如果公司有统一应用目录，可以替换为实际目录。

### 1. 上传或拉取代码

方式一：使用 Git 拉取：

```bash
sudo mkdir -p /opt/jxd-image-generation
sudo chown -R "$USER":"$USER" /opt/jxd-image-generation
cd /opt
git clone <你的代码仓库地址> jxd-image-generation
cd /opt/jxd-image-generation
```

方式二：上传压缩包后解压：

```bash
sudo mkdir -p /opt/jxd-image-generation
sudo chown -R "$USER":"$USER" /opt/jxd-image-generation
tar -xzf JXD-image-generation.tar.gz -C /opt/jxd-image-generation --strip-components=1
cd /opt/jxd-image-generation
```

### 2. 创建运行时目录

```bash
mkdir -p storage/uploads storage/outputs
```

### 3. 准备环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
vi .env
```

生产环境推荐内容如下，把 `服务器局域网IP`、`AUTH_SECRET` 和代理地址替换为实际值：

```env
APP_BASE_URL=http://服务器局域网IP:32179
PORT=32179
AUTH_SECRET=请替换为至少32位的随机字符串
SESSION_TTL_DAYS=7

GEMINI_DEFAULT_MODEL=gemini-3.1-flash-image-preview
GEMINI_ALLOWED_MODELS=gemini-3.1-flash-image-preview,gemini-3-pro-image-preview,gemini-2.5-flash-image

PROXY_ENABLED=true
APP_HTTP_PROXY=http://192.168.1.27:20171
APP_HTTPS_PROXY=http://192.168.1.27:20171

UPLOAD_MAX_IMAGES=8
UPLOAD_MAX_FILE_SIZE_MB=10
UPLOAD_ALLOWED_MIME_TYPES=image/png,image/jpeg,image/webp

OUTPUT_DIR=./storage/outputs
UPLOAD_DIR=./storage/uploads
DATABASE_URL=./storage/app.db

GENERATION_MAX_CONCURRENCY=3
GENERATION_TIMEOUT_SECONDS=120
```

生成随机 `AUTH_SECRET` 的命令示例：

```bash
openssl rand -hex 32
```

### 4. 校验 Compose 配置

```bash
docker compose config
```

如果这一步失败，先修正 `.env` 或 `docker-compose.yml`，不要继续启动。

### 5. 构建并启动

```bash
docker compose up -d --build
```

查看容器状态：

```bash
docker compose ps
```

查看启动日志：

```bash
docker compose logs -f image-generator
```

### 6. 初始化管理员密码

容器启动后执行：

```bash
docker compose exec image-generator node scripts/set-admin-password.cjs '你的管理员密码'
```

初始化内置普通用户。默认初始密码为 `666666`：

```bash
docker compose exec image-generator node scripts/seed-initial-users.cjs
```

管理员账号固定为：

```text
admin
```

### 7. 验证服务

在服务器上执行：

```bash
curl http://127.0.0.1:32179/api/health
```

期望返回：

```json
{"ok":true}
```

在局域网电脑浏览器打开：

```text
http://服务器局域网IP:32179
```

### 8. 配置防火墙

如果服务器启用了 firewalld：

```bash
sudo firewall-cmd --permanent --add-port=32179/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

如果服务器使用 ufw：

```bash
sudo ufw allow from 公司局域网网段 to any port 32179 proto tcp
sudo ufw status
```

如果由安全组或公司网关控制访问，需要在对应平台放行 `32179/tcp`，并限制为公司局域网网段。

## 首次初始化

1. 用管理员账号登录：

```text
账号：admin
密码：上一步脚本设置的密码
```

2. 进入 `设置` 页面。
3. 配置研发一部、研发二部的 Gemini API Key。
4. 配置程序级代理：

```text
http://192.168.1.27:20171
```

5. 使用设置页的代理/API 测试功能确认 Gemini 可访问。
6. 普通用户自助注册并选择部门。
7. 管理员在 `用户管理` 页面审核用户。
8. 普通用户登录后开始使用生图功能。

## 基本使用流程

管理员：

1. 登录系统。
2. 在 `设置` 中维护代理、部门 API Key、模型和上传限制。
3. 在 `用户管理` 页面创建用户、审核注册用户、禁用/启用用户、重置用户密码。
4. 在 `生成记录` 查看全部记录。
5. 在 `日志` 查看请求、响应和错误。

普通用户：

1. 注册账号并选择部门。
2. 等待管理员审核。
3. 登录后在首页选择文生图或图生图。
4. 填写提示词、分辨率、输出格式、横纵比。
5. 在页面底部确认“即将发送内容”。
6. 提交生成。
7. 在 `生成记录` 查看自己的列表和详情。

## 维护方法

查看容器状态：

```bash
docker compose ps
```

查看实时日志：

```bash
docker compose logs -f image-generator
```

查看最近 200 行日志：

```bash
docker compose logs --tail=200 image-generator
```

重启服务：

```bash
docker compose restart image-generator
```

停止服务：

```bash
docker compose down
```

启动服务：

```bash
docker compose up -d
```

修改管理员密码：

```bash
docker compose exec image-generator node scripts/set-admin-password.cjs '新密码'
```

查看健康状态：

```bash
curl http://127.0.0.1:32179/api/health
```

查看磁盘占用：

```bash
du -sh storage
du -sh storage/uploads storage/outputs
```

## 更新发布

如果使用 Git 部署：

```bash
cd /opt/jxd-image-generation
git pull
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:32179/api/health
```

如果使用压缩包部署：

```bash
cd /opt/jxd-image-generation
docker compose down
tar -czf "../jxd-image-generation-backup-$(date +%Y%m%d%H%M%S).tar.gz" storage .env
tar -xzf /path/to/new-JXD-image-generation.tar.gz -C /opt/jxd-image-generation --strip-components=1
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:32179/api/health
```

更新后建议登录页面检查：

- 登录是否正常。
- 设置页代理和 API Key 是否仍在。
- 文生图是否可提交。
- 图生图是否可上传并提交。
- 生成记录和日志是否可查看。

## 备份与恢复

### 备份

`storage` 目录包含 SQLite 数据库、上传图片和输出图片，必须整体备份。

```bash
cd /opt/jxd-image-generation
mkdir -p backups
tar -czf "backups/storage-$(date +%Y%m%d%H%M%S).tar.gz" storage
cp .env "backups/env-$(date +%Y%m%d%H%M%S).bak"
```

### 恢复

恢复前先停止容器：

```bash
cd /opt/jxd-image-generation
docker compose down
mv storage "storage.bak.$(date +%Y%m%d%H%M%S)"
tar -xzf backups/storage-需要恢复的时间.tar.gz
docker compose up -d
curl http://127.0.0.1:32179/api/health
```

如果同时恢复 `.env`：

```bash
cp backups/env-需要恢复的时间.bak .env
docker compose up -d --build
```

## 验证命令

代码级验证：

```bash
npm run lint
npm run typecheck
npm run build
```

Docker 配置验证：

```bash
docker compose config
```

服务健康验证：

```bash
curl http://127.0.0.1:32179/api/health
```

端口监听验证：

```bash
ss -lntp | grep 32179
```

存储文件保护验证。未登录时应返回 `401`：

```bash
curl -i http://127.0.0.1:32179/storage/app.db
```

## 部署注意事项检查清单

- `.env` 中 `AUTH_SECRET` 必须替换，不能使用示例值。
- `APP_BASE_URL` 必须改成局域网访问地址，例如 `http://192.168.1.100:32179`。
- 所有路径必须是相对路径，例如 `./storage/outputs`。
- 服务器上 `./storage` 需要持久化和备份。
- Linux 防火墙需要放行 `32179/tcp`。
- 确认程序级代理可访问 Gemini，不要依赖服务器全局代理。
- 部门 API Key 只在设置页维护，不要写入前端代码或 `.env`。
- 部门 API Key 加密保存在 `./storage/app.db` 的 `departments.gemini_api_key_encrypted` 字段，迁移和恢复时必须保留同一份 `AUTH_SECRET`。
- `admin` 密码需要通过脚本设置，不能保持未初始化状态。
- SQLite 适合当前内部 MVP；高并发或多人高频使用时需要评估数据库迁移。
- 日志会记录提示词和请求参数，管理员应注意内部数据可见范围。
- Docker 构建时需要能拉取 `node:22-bookworm-slim` 基础镜像；如公司网络无法访问，需要配置 Docker 镜像源。

## 常见问题排查

### 页面打不开

检查容器是否启动：

```bash
docker compose ps
docker compose logs --tail=200 image-generator
```

检查端口：

```bash
ss -lntp | grep 32179
```

检查防火墙：

```bash
sudo firewall-cmd --list-ports
```

或：

```bash
sudo ufw status
```

### 健康接口失败

```bash
curl -i http://127.0.0.1:32179/api/health
docker compose logs --tail=200 image-generator
```

优先检查 `.env`、数据库目录权限和容器日志。

### Gemini 请求失败

1. 管理员登录系统，进入 `设置`。
2. 确认对应部门 API Key 已配置。
3. 确认代理已启用。
4. 确认代理地址格式为：

```text
http://192.168.1.27:20171
```

5. 在服务器上测试代理连通性：

```bash
curl -x http://192.168.1.27:20171 https://generativelanguage.googleapis.com/
```

6. 查看系统日志页面和容器日志：

```bash
docker compose logs --tail=200 image-generator
```

### 管理员忘记密码

重新设置即可：

```bash
docker compose exec image-generator node scripts/set-admin-password.cjs '新管理员密码'
```

### 磁盘空间增长过快

查看空间：

```bash
du -sh storage storage/uploads storage/outputs
```

处理方式：

1. 管理员在 `生成记录` 中删除不需要的记录。
2. 删除会物理删除数据库记录、输出图和上传缓存。
3. 删除前如需留档，先备份 `storage`。

### Docker 构建拉不到基础镜像

现象通常是 `load metadata for docker.io/library/node:22-bookworm-slim` 失败。

处理方式：

1. 检查服务器是否能访问 Docker Hub。
2. 配置公司内网 Docker 镜像源。
3. 重新执行：

```bash
docker compose build --no-cache
docker compose up -d
```

## 当前限制

- 不做部门级生成次数限制。
- 不做部门级并发限制，仅有全局并发限制。
- 不审计上传图片内容。
- 生成记录删除为物理删除，删除后不可恢复，除非有 `storage` 备份。
