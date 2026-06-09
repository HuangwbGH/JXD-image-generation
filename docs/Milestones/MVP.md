# MVP 里程碑

## 目录

- [目标](#目标)
- [已完成能力](#已完成能力)
- [待补齐能力](#待补齐能力)
- [验收方式](#验收方式)

## 目标

交付一个可在公司内网使用的 Gemini 生图工具，支持登录、部门隔离、文生图、图生图、配置维护、记录留存和 Docker 部署。

## 已完成能力

- Next.js 应用框架。
- 本地账号登录、注册、审核和会话。
- 管理员用户管理。
- 部门 API Key 加密保存。
- 文生图和图生图表单。
- Gemini REST 调用和程序级代理。
- 生成记录、系统日志和受保护文件访问。
- Dockerfile 和 Docker Compose。

## 待补齐能力

- 端口映射参数化。
- 生成超时配置接入。
- 自动化测试。
- 更完整的 Gemini 连通性测试页面入口。

## 验收方式

- 静态检查：`npm run lint`、`npm run typecheck`、`npm run build`。
- 部署检查：`docker compose config`、`docker compose up -d --build`。
- 人工链路：管理员初始化、配置 API Key、普通用户生成、记录删除、日志检查。
