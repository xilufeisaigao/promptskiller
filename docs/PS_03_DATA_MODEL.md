# [PromptSkiller] 数据模型（Supabase / Postgres）

本文档描述当前线上可用的数据库结构（对应 `db/migrations`），不是纯规划草案。

## 迁移清单（已落地）

- `001_init.sql`：`profiles`、`drills`、`drill_schedule`、`drill_attempts`
- `002_weekly_challenges.sql`：`weekly_challenges`、`challenge_submissions`、`submission_votes` + 计数触发器
- `003_drills_display_no.sql`：`drills.display_no`（全站题号）
- `004_admin_rbac_and_schedule_slots.sql`：管理员权限、排期 slot 化、后台读取权限
- `005_drill_types_and_assets.sql`：题型字段、附件表 `drill_assets`
- `006_drill_sessions_and_rounds.sql`：会话表 `drill_sessions`、轮次表 `drill_session_rounds`
- `007_drill_modules.sql`：模块表 `drill_modules`、模块题目表 `drill_module_items`
- `008_drill_user_progress.sql`：用户训练进度聚合表 `drill_user_progress`

## 核心训练域表

### `profiles`

用途：补充 `auth.users` 的公开资料与角色字段。

- `id`：`uuid`，主键，关联 `auth.users.id`
- `handle`：`text`，唯一用户名
- `display_name`：`text`，展示名
- `avatar_url`：`text`，头像地址
- `is_admin`：`boolean`，管理员标记（默认 `false`）
- `created_at`：`timestamptz`

### `drills`

用途：训练题内容主表。

- `id`：`text`，主键，稳定 slug（例如 `drill-debug-minimal-repro`）
- `display_no`：`int`，唯一，全站递增题号（前端显示 `PS-001`）
- `title`：`text`，题目标题
- `body_md`：`text`，题面正文
- `difficulty`：`smallint`，难度 1-5
- `drill_type`：`text`，`prompt_case` / `code_case_multi` / `build_sim_case`
- `tags`：`text[]`，标签
- `module_id`：`text`，可选，快捷模块归属（外键到 `drill_modules.id`）
- `published_at`：`timestamptz`，发布时间
- `created_at`：`timestamptz`

### `drill_assets`

用途：题目附件上下文（多文件/日志/规格）。

- `id`：`uuid`，主键
- `drill_id`：`text`，外键到 `drills.id`
- `asset_kind`：`text`，`file` / `log` / `spec`
- `path`：`text`，附件路径（例如 `src/auth/client.ts`）
- `content_text`：`text`，附件正文
- `order_no`：`int`，显示顺序
- `created_at`：`timestamptz`
- `updated_at`：`timestamptz`

约束与索引：

- `unique (drill_id, asset_kind, path)`
- `check (asset_kind in ('file','log','spec'))`
- `check (order_no > 0)`

### `drill_schedule`

用途：每日题单排期表（支持一天 1-3 题）。

- `date`：`date`，UTC 日期
- `slot`：`smallint`，题位（1-3）
- `drill_id`：`text`，外键到 `drills.id`

主键与约束：

- `primary key (date, slot)`
- `check (slot between 1 and 3)`

说明：`/drills/today` 会优先读取该表，缺口再自动补齐推荐题。

### `drill_attempts`

用途：记录用户对训练题的每次提交（统计维度）。

- `id`：`uuid`，主键
- `user_id`：`uuid`，外键到 `auth.users.id`
- `drill_id`：`text`，外键到 `drills.id`
- `prompt_text`：`text`，用户提示词
- `coach_mode`：`text`，`mock` 或 `openai`
- `coach_feedback`：`jsonb`，结构化反馈
- `score_total`：`int`，总分
- `created_at`：`timestamptz`

说明：会话化后仍保留该表，作为“快速统计聚合层”。

评分口径（当前版本）：

- 6 维评分：`context`、`constraints`、`output_format`、`acceptance_criteria`、`tests_and_edge_cases`、`process_control`
- 每维 `0-20`，`score_total` 总分 `0-120`

### `drill_sessions`

用途：训练会话（反馈模式与会话终态）。

- `id`：`uuid`，主键
- `user_id`：`uuid`，外键到 `auth.users.id`
- `drill_id`：`text`，外键到 `drills.id`
- `feedback_mode`：`text`，`guided` / `final_only`
- `status`：`text`，`in_progress` / `completed`
- `final_report_json`：`jsonb`，终局评分汇总
- `created_at`：`timestamptz`
- `updated_at`：`timestamptz`
- `completed_at`：`timestamptz`（可空）

### `drill_session_rounds`

用途：训练轮次记录（每轮 prompt / 模型输出 / 评分 / 可见性）。

- `id`：`uuid`，主键
- `session_id`：`uuid`，外键到 `drill_sessions.id`
- `round_no`：`int`，轮次
- `user_prompt_text`：`text`
- `model_output_json`：`jsonb`（包含 `round_output`）
- `round_eval_json`：`jsonb`（结构化评分）
- `eval_visible_to_user`：`boolean`（终局模式下前期为 `false`）
- `workspace_state_json`：`jsonb`（虚拟工作区快照）
- `changed_files_json`：`jsonb`
- `created_at`：`timestamptz`

约束：`unique (session_id, round_no)`。

### `drill_user_progress`

用途：按用户与题目聚合训练进度（用于题库/模块进度展示与后台统计）。

- `user_id`：`uuid`，外键到 `auth.users.id`
- `drill_id`：`text`，外键到 `drills.id`
- `first_practiced_at`：`timestamptz`
- `last_practiced_at`：`timestamptz`
- `attempt_count`：`int`
- `best_score`：`int`（可空）
- `last_score`：`int`（可空）
- `updated_at`：`timestamptz`

约束与来源：

- `primary key (user_id, drill_id)`
- `check (attempt_count >= 0)`
- 通过触发器 `drill_attempts_upsert_progress` 在每次 `drill_attempts` 插入后自动 upsert
- 支持历史回填（migration 内含 backfill SQL）

### `drill_modules`

用途：学习路径模块主表。

- `id`：`text`，主键
- `slug`：`text`，唯一
- `title`：`text`
- `description`：`text`
- `level`：`text`，`starter` / `intermediate` / `advanced`
- `estimated_minutes`：`int`（可空）
- `cover_style`：`text`（可空）
- `published_at`：`timestamptz`（可空）
- `created_at`：`timestamptz`
- `updated_at`：`timestamptz`

### `drill_module_items`

用途：模块题目序列。

- `module_id`：`text`，外键到 `drill_modules.id`
- `drill_id`：`text`，外键到 `drills.id`
- `position`：`int`，模块内顺序
- `created_at`：`timestamptz`

约束：

- `primary key (module_id, drill_id)`
- `unique (module_id, position)`
- `check (position > 0)`

## 比赛域表（保留）

### `weekly_challenges`

周赛题目主表。

### `challenge_submissions`

周赛作品提交表（每挑战每用户最多 1 条）。

### `submission_votes`

周赛投票表（每投稿每用户最多 1 票，禁止自投）。

## 角色与权限（RLS）摘要

- Public read：`drills`、`drill_assets`、`drill_schedule`、`drill_modules`、`drill_module_items`、`weekly_challenges`、`challenge_submissions`、`submission_votes`
- User owner：`drill_attempts`、`drill_sessions`、`drill_session_rounds`（普通用户仅可读写自己的训练数据）
- User owner read：`drill_user_progress`（用户仅读自己的聚合进度）
- Admin write：`drills`、`drill_assets`、`drill_schedule`、`drill_modules`、`drill_module_items`
- Admin read：`drill_attempts` / `drill_sessions` / `drill_session_rounds` / `drill_user_progress` 全量读取（后台统计）

## 管理员相关函数与触发器

- `public.is_admin(uid)`：判断是否管理员（供 RLS policy 使用）
- `public.handle_new_user_profile()`：新建 auth 用户时自动补 `profiles` 行
- `touch_*_updated_at` 系列触发器：自动维护 `updated_at`

## 最近一次数据库状态（2026-02-28）

采集时间：`2026-02-28 13:45:00 UTC`

- `drills = 14`
- `drill_assets = 16`
- `drill_modules = 3`
- `drill_module_items = 15`
- `drill_schedule = 42`
- `drill_sessions = 0`
- `drill_session_rounds = 0`
- `drill_attempts = 5`
- `drill_user_progress = 4`
- `weekly_challenges = 1`

可复查命令：

- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:status`
