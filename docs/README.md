# 公司内部 Gemini 生图网站建设文档

本文档集用于规划一个公司内部使用的 AI 生图网站，核心能力包括用户登录、文生图、图生图、按部门配置 Gemini API Key、可配置程序级 HTTP/HTTPS 代理。参考界面来自本仓库的 `参考图.png` 与 `https://nanobananaimg.com/zh/generate`。

## 文档目录

- [PRD 产品需求文档](./PRD.md)
- [产品与范围规划](./product-plan.md)
- [技术架构设计](./technical-architecture.md)
- [Gemini API 接入方案](./gemini-api-guide.md)
- [配置与部署指南](./configuration-and-deployment.md)
- [实施里程碑](./implementation-roadmap.md)

## 建设目标

1. 面向公司内部同事，登录后使用，不建设订阅、计费、积分、联盟计划等公网商业化模块。
2. 支持文生图和图生图，图生图允许上传参考图并输入自然语言编辑要求。
3. 后端统一代理 Gemini 调用，API Key 不暴露到浏览器。
4. 支持在设置页维护研发一部、研发二部和管理员账号，按部门维护 Gemini API Key，并配置模型、程序级代理、上传限制、输出目录。
5. 页面采用工具台布局：左侧参数面板，右侧生成预览与历史结果。
6. 所有路径使用相对路径，使用 Docker 部署并支持 Linux OS。
7. 开发遵循根目录 `AGENTS.md`。

## 推荐技术栈

- 前端与后端：Next.js App Router + TypeScript。
- UI：React + CSS + lucide-react。
- Gemini 接入：服务端 REST 调用 Gemini `generateContent`，通过 `undici` 注入程序级代理。
- 图片存储：本地文件系统，路径使用相对路径。
- 数据库：SQLite。
- 部署：Docker Compose，内网反向代理到公司域名。

## 参考来源

- Gemini 图像生成官方文档：https://ai.google.dev/gemini-api/docs/image-generation
- Nano Banana 参考页面：https://nanobananaimg.com/zh/generate
- 参考图：`参考图.png`
