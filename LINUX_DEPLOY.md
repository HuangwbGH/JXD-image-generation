# Linux 部署说明

## 目录

- [适用范围](#适用范围)
- [前置要求](#前置要求)
- [部署步骤](#部署步骤)
- [首次初始化](#首次初始化)
- [维护命令](#维护命令)
- [数据说明](#数据说明)
- [排查入口](#排查入口)

## 适用范围

本文档用于在 Linux 服务器通过 Docker Compose 部署公司内部 Gemini 生图工具。所有项目内路径示例均使用相对路径。

## 前置要求

- 已安装 Docker 和 Docker Compose v2。
- 服务器可通过公司网络或程序级代理访问 Gemini。
- 局域网访问规则允许访问 `.env` 中配置的端口，默认 `32179`。
- 已准备好本项目代码目录，并在项目根目录执行以下命令。

## 部署步骤

```bash
cp .env.example .env
mkdir -p storage/uploads storage/outputs
```

编辑 `.env`，至少修改：

```env
APP_BASE_URL=http://服务器局域网IP:32179
PORT=32179
AUTH_SECRET=替换为至少32位随机字符串
PROXY_ENABLED=true
APP_HTTP_PROXY=http://代理地址:端口
APP_HTTPS_PROXY=http://代理地址:端口
```

启动：

```bash
docker compose up -d --build
docker compose ps
curl -i http://127.0.0.1:32179/api/health
```

浏览器访问 `http://服务器局域网IP:32179`。

## 首次初始化

容器启动前或本地维护时执行：

```bash
npm run admin:set-password -- '替换为管理员密码'
npm run users:seed-initial
```

容器内维护时执行：

```bash
docker compose exec image-generator node scripts/set-admin-password.cjs '替换为管理员密码'
docker compose exec image-generator node scripts/seed-initial-users.cjs
```

登录后在设置页配置部门 Gemini API Key、模型、代理和上传限制。

## 维护命令

```bash
docker compose ps
docker compose logs --tail=100 image-generator
docker compose restart image-generator
docker compose down
docker compose up -d --build
```

## 数据说明

`./storage` 挂载为容器内运行数据目录，包含：

- `app.db`：SQLite 数据库。
- `uploads/`：图生图上传缓存。
- `outputs/`：生成结果图片。

备份时必须同时保留 `./storage` 和 `.env` 中的 `AUTH_SECRET`。

## 排查入口

- 健康检查：`curl -i http://127.0.0.1:32179/api/health`。
- 容器日志：`docker compose logs --tail=100 image-generator`。
- 配置说明：`docs/Config.md`。
- 部署说明：`docs/Deployment.md`。
- 测试记录：`docs/TestReport.md`。
