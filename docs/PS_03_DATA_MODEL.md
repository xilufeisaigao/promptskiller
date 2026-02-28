# [PromptSkiller] 数据模型（Supabase / Postgres）

本文档描述当前线上可用的数据库结构（对应 `db/migrations`），不是纯规划草案。

## 迁移清单（已落地）

- `001_init.sql`：`profiles`、`drills`、`drill_schedule`、`drill_attempts`
- `002_weekly_challenges.sql`：`weekly_challenges`、`challenge_submissions`、`submission_votes` + 计数触发器
- `003_drills_display_no.sql`：`drills.display_no`（全站题号）

## 核心表与用途

### `profiles`

用途：补充 `auth.users` 的公开资料字段。

- `id`：`uuid`，主键，关联 `auth.users.id`
- `handle`：`text`，唯一用户名
- `display_name`：`text`，展示名
- `avatar_url`：`text`，头像地址
- `created_at`：`timestamptz`

### `drills`

用途：训练题内容主表。

- `id`：`text`，主键，稳定 slug（例如 `drill-debug-minimal-repro`）
- `display_no`：`int`，唯一，全站递增题号（前端显示 `PS-001`）
- `title`：`text`，题目标题
- `body_md`：`text`，题面正文
- `difficulty`：`smallint`，难度 1-5
- `tags`：`text[]`，标签
- `published_at`：`timestamptz`，发布时间
- `created_at`：`timestamptz`

### `drill_schedule`

用途：日期到题目的映射表（可用于手工排期）。

- `date`：`date`，主键
- `drill_id`：`text`，外键到 `drills.id`

说明：当前“今日 3 题”主要按 UTC 日期 + 题库列表确定性选择，尚未强依赖该表。

### `drill_attempts`

用途：记录用户对训练题的每次提示词提交及教练反馈。

- `id`：`uuid`，主键
- `user_id`：`uuid`，外键到 `auth.users.id`
- `drill_id`：`text`，外键到 `drills.id`
- `prompt_text`：`text`，用户提示词
- `coach_mode`：`text`，`mock` 或 `openai`
- `coach_feedback`：`jsonb`，结构化反馈
- `score_total`：`int`，总分
- `created_at`：`timestamptz`

索引：

- `(user_id, drill_id, created_at desc)`
- `(user_id, created_at desc)`

### `weekly_challenges`

用途：周赛题目主表。

- `id`：`uuid`，主键
- `slug`：`text`，唯一，可读 URL（例如 `week-2026-02-23`）
- `title`：`text`
- `body_md`：`text`
- `start_at`：`timestamptz`
- `end_at`：`timestamptz`
- `created_at`：`timestamptz`

### `challenge_submissions`

用途：周赛作品提交。

- `id`：`uuid`，主键
- `challenge_id`：`uuid`，外键到 `weekly_challenges.id`
- `user_id`：`uuid`，外键到 `auth.users.id`
- `artifact_url`：`text`，作品地址
- `artifact_type`：`text`，如 `url` / `image` / `repo`
- `prompt_log_md`：`text`，关键提示词记录
- `notes`：`text`，可选说明
- `votes_count`：`int`，缓存计数字段（由触发器维护）
- `created_at`：`timestamptz`
- `updated_at`：`timestamptz`

约束：

- `unique(challenge_id, user_id)`：每个挑战每个用户仅 1 份提交

### `submission_votes`

用途：周赛点赞投票。

- `id`：`uuid`，主键
- `submission_id`：`uuid`，外键到 `challenge_submissions.id`
- `voter_id`：`uuid`，外键到 `auth.users.id`
- `created_at`：`timestamptz`

约束：

- `unique(submission_id, voter_id)`：防止重复投票

## RLS 与权限摘要

- Public read：`drills`、`drill_schedule`、`weekly_challenges`、`challenge_submissions`、`submission_votes`
- Private owner：`drill_attempts`（仅 owner 读写）
- 周赛提交：仅 owner 可写，且受挑战时间窗口约束
- 投票：仅登录用户可写，且禁止自投

## 最近一次数据库状态（2026-02-28）

- `drills = 5`
- `weekly_challenges = 1`
- `challenge_submissions = 0`
- `submission_votes = 0`

可复查命令：`npm run db:status`
