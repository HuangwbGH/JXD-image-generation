# MVP 当前实现规格

## 目录

- [范围](#范围)
- [页面](#页面)
- [API](#api)
- [权限](#权限)
- [存储](#存储)
- [配置](#配置)
- [验收](#验收)

## 范围

本文档记录当前代码已实现的 MVP 规格，用于后续代码修改前核对边界。

## 页面

- `/login`：账号密码登录。
- `/register`：普通用户注册，部门固定为 `研发一部` 或 `研发二部`。
- `/`：生图工作台。
- `/records`：生成记录列表和详情。
- `/settings`：管理员设置页。
- `/users`：管理员用户管理页。
- `/logs`：管理员系统日志页。

## API

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/generate`
- `GET /api/records`
- `POST /api/records/[id]`
- `DELETE /api/records/[id]`
- `GET /api/settings`
- `POST /api/settings`
- `POST /api/settings/test`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `POST /api/admin/users/[id]/approve`
- `POST /api/admin/users/[id]/reject`
- `POST /api/admin/users/[id]/enable`
- `POST /api/admin/users/[id]/reset-password`
- `GET /api/logs`
- `GET /api/health`

## 权限

- 未登录用户不能访问业务页面和业务 API。
- 普通用户只能查看和删除自己的生成记录。
- 管理员能查看全部生成记录、设置、用户和日志。
- 受保护文件访问依赖登录态。

## 存储

- SQLite：`./storage/app.db`。
- 上传缓存：`./storage/uploads`。
- 生成结果：`./storage/outputs`。

## 配置

- `.env` 提供启动默认值。
- 设置页配置写入 `app_settings`。
- 部门 API Key 写入 `departments.gemini_api_key_encrypted`。

## 验收

执行 `docs/TestReport.md` 中的建议回归清单。
