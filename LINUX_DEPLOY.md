# Linux 部署说明

本包用于把公司内部 AI 生图工具部署到 Linux 服务器。

## 1. 前置要求

- Linux 服务器已安装 Docker 和 Docker Compose。
- 服务器能访问 npm registry，或已配置可用代理。
- 默认服务端口为 `32179`，需要放通服务器防火墙或内网访问规则。

## 2. 解压部署包

```bash
mkdir -p /opt/jxd-image-generation
tar -xzf jxd-image-generation-linux-deploy.tar.gz -C /opt/jxd-image-generation --strip-components=1
cd /opt/jxd-image-generation
```

## 3. 配置环境变量

部署包内已提供 `.env`。首次部署前建议至少检查这些配置：

```bash
vi .env
```

重点配置：

- `APP_BASE_URL`：改成服务器实际访问地址，例如 `http://192.168.88.20:32179` 或内网域名。
- `AUTH_SECRET`：生产环境建议改成足够长的随机字符串。
- `APP_HTTP_PROXY` / `APP_HTTPS_PROXY`：如服务器访问 Gemini 需要代理，填公司代理地址。
- `OUTPUT_DIR` / `UPLOAD_DIR` / `DATABASE_URL`：默认使用挂载目录 `./storage`，通常不需要改。

## 4. 启动服务

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f
```

健康检查：

```bash
curl http://127.0.0.1:32179/api/health
```

浏览器访问：

```text
http://服务器IP:32179
```

## 5. 常用维护命令

停止服务：

```bash
docker compose down
```

重启服务：

```bash
docker compose restart
```

更新代码后重新构建：

```bash
docker compose up -d --build
```

备份数据：

```bash
tar -czf storage-backup-$(date +%Y%m%d%H%M%S).tar.gz storage
```

## 6. 数据说明

`storage` 目录会挂载到容器内 `/app/storage`，其中包含：

- `storage/app.db`：用户、设置、生成记录、日志等 SQLite 数据。
- `storage/uploads`：上传图片。
- `storage/outputs`：生成图片。

不要删除 `storage`，否则会丢失用户、设置和历史图片。

