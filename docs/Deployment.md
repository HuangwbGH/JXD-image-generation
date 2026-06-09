# 部署说明

## 目录

- [用途](#用途)
- [本地开发](#本地开发)
- [Docker 部署](#docker-部署)
- [首次初始化](#首次初始化)
- [健康检查](#健康检查)
- [备份与恢复](#备份与恢复)
- [发布检查](#发布检查)

## 用途

本文档说明本项目在本地和 Linux Docker 环境中的部署、初始化、验证和维护方式。

## 本地开发

```bash
npm install
cp .env.example .env
npm run admin:set-password -- '替换为管理员密码'
npm run users:seed-initial
npm run dev
```

访问 `http://localhost:32179`。

## Docker 部署

```bash
cp .env.example .env
mkdir -p storage/uploads storage/outputs
docker compose up -d --build
docker compose ps
```

生产环境必须修改 `.env` 中的 `AUTH_SECRET`、`APP_BASE_URL` 和代理配置。

## 首次初始化

- 管理员账号固定为 `admin`。
- 使用 `npm run admin:set-password -- '替换为管理员密码'` 设置管理员密码。
- 使用 `npm run users:seed-initial` 初始化内置普通用户，或走注册审核流程。
- 登录设置页后，为 `研发一部` 和 `研发二部` 配置 Gemini API Key。

## 健康检查

```bash
curl -i http://127.0.0.1:32179/api/health
docker compose logs --tail=100 image-generator
```

## 备份与恢复

备份：

- `./storage/app.db`
- `./storage/uploads`
- `./storage/outputs`
- `.env` 中的 `AUTH_SECRET`

恢复：

1. 停止服务。
2. 恢复 `./storage`。
3. 恢复或重新设置 `.env`。
4. 启动服务。
5. 登录设置页检查部门 API Key 状态。

## 发布检查

```bash
npm run lint
npm run typecheck
npm run build
docker compose config
```

发布后执行一次健康检查，并使用管理员账号验证登录、设置页和至少一次生成链路。
