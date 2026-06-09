# 文档索引

## 目录

- [用途](#用途)
- [权威文档](#权威文档)
- [专题文档](#专题文档)
- [过程文档](#过程文档)
- [维护规则](#维护规则)

## 用途

本文档是 `docs/` 的统一入口，用于快速定位产品、架构、配置、部署、数据库、测试和过程记录。

## 权威文档

- `../AGENTS.md`：AI 编程和协作规范。
- `../PRD.md`：根目录 PRD 入口。
- `PRD.md`：完整产品需求。
- `ProcessTodo.md`：当前任务进展、待办、阻塞和需要用户提供的信息。

## 专题文档

- `Config.md`：配置项、来源、默认值和维护方式。
- `Deployment.md`：本地与 Docker 部署流程。
- `DatabaseSchema.md`：SQLite 表结构和数据维护规则。
- `technical-architecture.md`：模块、数据流、API 和安全边界。
- `gemini-api-guide.md`：Gemini 图像生成接入说明。
- `product-plan.md`：产品范围规划。
- `configuration-and-deployment.md`：历史配置部署方案，后续以 `Config.md` 和 `Deployment.md` 为主。
- `implementation-roadmap.md`：里程碑规划。

## 过程文档

- `TestReport.md`：测试和验收记录。
- `Milestones/MVP.md`：MVP 里程碑状态。
- `Specs/MVP-current.md`：当前实现规格快照。

## 维护规则

- 修改功能、接口、配置、数据库、部署、页面交互或测试方式后，必须更新相关文档。
- 所有路径示例使用相对路径。
- 不能确认的内容标记为 `待确认`。
- 废弃内容标记为 `已废弃`，并写明替代文档。
