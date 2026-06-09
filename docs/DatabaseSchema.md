# 数据库结构

## 目录

- [用途](#用途)
- [数据库](#数据库)
- [表结构](#表结构)
- [初始化数据](#初始化数据)
- [维护规则](#维护规则)

## 用途

本文档记录当前 SQLite 数据库结构，与 `lib/db/database.ts` 保持一致。

## 数据库

默认数据库文件为 `./storage/app.db`。首次调用 `getDb()` 时自动创建目录、打开数据库、启用 WAL，并执行迁移。

## 表结构

### `departments`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PRIMARY KEY | 部门 ID，当前为 `rd_1`、`rd_2`。 |
| `name` | TEXT | 部门名称。 |
| `gemini_api_key_encrypted` | TEXT | 加密后的 Gemini API Key。 |
| `enabled` | INTEGER | 是否启用。 |
| `created_at` | TEXT | 创建时间。 |
| `updated_at` | TEXT | 更新时间。 |

### `users`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PRIMARY KEY | 用户 ID。 |
| `username` | TEXT UNIQUE | 登录用户名。 |
| `display_name` | TEXT | 展示名。 |
| `password_hash` | TEXT | scrypt 密码哈希。 |
| `role` | TEXT | `admin` 或 `user`。 |
| `department_id` | TEXT | 普通用户所属部门。 |
| `status` | TEXT | `pending`、`active`、`rejected`。 |
| `enabled` | INTEGER | 是否启用。 |
| `reviewed_by` | TEXT | 审核管理员 ID。 |
| `reviewed_at` | TEXT | 审核时间。 |
| `created_at` | TEXT | 创建时间。 |
| `updated_at` | TEXT | 更新时间。 |

### `sessions`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PRIMARY KEY | 会话 ID，同时写入 HttpOnly Cookie。 |
| `user_id` | TEXT | 用户 ID。 |
| `expires_at` | TEXT | 过期时间。 |
| `created_at` | TEXT | 创建时间。 |

### `app_settings`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `key` | TEXT PRIMARY KEY | 配置键。 |
| `value` | TEXT | 配置值，复杂值以 JSON 字符串保存。 |
| `updated_at` | TEXT | 更新时间。 |

### `generation_jobs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PRIMARY KEY | 生成任务 ID。 |
| `user_id` | TEXT | 发起用户 ID。 |
| `department_id` | TEXT | 使用的部门 ID。 |
| `mode` | TEXT | `text-to-image` 或 `image-to-image`。 |
| `model` | TEXT | Gemini 模型。 |
| `prompt` | TEXT | 提示词。 |
| `aspect_ratio` | TEXT | 比例。 |
| `image_size` | TEXT | 分辨率。 |
| `output_format` | TEXT | 输出格式。 |
| `input_images` | TEXT | 输入图片 JSON。 |
| `output_images` | TEXT | 输出图片 JSON。 |
| `status` | TEXT | 当前仅记录成功任务。 |
| `error_message` | TEXT | 错误摘要，当前成功任务为空。 |
| `duration_ms` | INTEGER | 耗时毫秒。 |
| `created_at` | TEXT | 创建时间。 |

### `system_logs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PRIMARY KEY | 日志 ID。 |
| `level` | TEXT | 日志级别。 |
| `action` | TEXT | 动作名称。 |
| `user_id` | TEXT | 用户 ID。 |
| `username` | TEXT | 用户名。 |
| `department_id` | TEXT | 部门 ID。 |
| `target_id` | TEXT | 目标对象 ID。 |
| `message` | TEXT | 日志消息。 |
| `metadata` | TEXT | JSON 元数据，不记录 API Key 和图片 base64。 |
| `created_at` | TEXT | 创建时间。 |

## 初始化数据

- 自动创建部门：`rd_1` 为 `研发一部`，`rd_2` 为 `研发二部`。
- 自动创建管理员用户：用户名 `admin`，初始 `password_hash` 为 `UNSET`，需执行脚本设置密码。
- 自动写入默认设置：模型、代理、上传限制和输出目录。

## 维护规则

- 不手工编辑 API Key 加密字段，应通过设置页维护。
- 删除生成记录必须同步删除 `input_images` 和 `output_images` 指向的文件。
- 备份数据库时必须同步备份 `AUTH_SECRET`。
