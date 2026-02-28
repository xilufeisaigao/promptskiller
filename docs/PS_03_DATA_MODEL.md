# [PromptSkiller] 数据模型（Supabase / Postgres）

下面是一个建议的起始 schema。刻意保持最小化，后续可以迭代演进。

## 表（Tables）

### `profiles`

对 Supabase `auth.users` 的补充，用于存公开的个人资料信息。

状态：已创建（见 `db/migrations/001_init.sql`）

- `id` (uuid, pk, references auth.users.id)
- `handle` (text, unique)
- `display_name` (text)
- `avatar_url` (text, nullable)
- `created_at` (timestamptz)

### `drills`

每日训练题（提示词练习场景）。

状态：已创建（见 `db/migrations/001_init.sql`）

- `id` (text, pk) 说明：使用稳定 slug（例如 `drill-debug-minimal-repro`）
- `display_no` (int, unique) 说明：全站递增题号（例如 `1,2,3...`，前端可展示为 `PS-001`）
- `title` (text)
- `body_md` (text) markdown 正文
- `difficulty` (int) (1-5)
- `tags` (text[]) optional
- `published_at` (timestamptz, nullable)
- `created_at` (timestamptz)

### `drill_schedule`

把一个日期映射到一个训练题。

状态：已创建（见 `db/migrations/001_init.sql`）

- `date` (date, pk)
- `drill_id` (text, references drills.id)

替代方案（更简单）：

- 不建 schedule 表；用 `date % N` 等方式计算当天题目（但可控性较弱）。

### `drill_attempts`

用户对某个训练题提交的提示词记录（包含教练反馈）。

状态：已创建（见 `db/migrations/001_init.sql`）

- `id` (uuid, pk)
- `user_id` (uuid, references auth.users.id)
- `drill_id` (text, references drills.id)
- `prompt_text` (text)
- `coach_mode` (text) 例如 `mock` / `openai`
- `coach_feedback` (jsonb) 结构化反馈
- `score_total` (int)
- `created_at` (timestamptz)

### `weekly_challenges`

状态：已创建（见 `db/migrations/002_weekly_challenges.sql`）

- `id` (uuid, pk)
- `slug` (text, unique) 说明：可读 URL（例如 `week-2026-02-23`）
- `title` (text)
- `body_md` (text)
- `start_at` (timestamptz)
- `end_at` (timestamptz)
- `created_at` (timestamptz)

### `challenge_submissions`

状态：已创建（见 `db/migrations/002_weekly_challenges.sql`）

- `id` (uuid, pk)
- `challenge_id` (uuid, references weekly_challenges.id)
- `user_id` (uuid, references auth.users.id)
- `artifact_url` (text)（如需要也可拆成多个字段）
- `artifact_type` (text) e.g. url | image | repo
- `prompt_log_md` (text) markdown
- `notes` (text, nullable)
- `votes_count` (int) 说明：为列表展示做的计数缓存（由触发器维护）
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

唯一性（Uniqueness）：

- `unique(challenge_id, user_id)`：MVP 限制每人每题只提交一次。

### `submission_votes`

状态：已创建（见 `db/migrations/002_weekly_challenges.sql`）

- `id` (uuid, pk)
- `submission_id` (uuid, references challenge_submissions.id)
- `voter_id` (uuid, references auth.users.id)
- `created_at` (timestamptz)

唯一性（Uniqueness）：

- `unique(submission_id, voter_id)`：防止重复投票。

## RLS 说明（初稿）

- 公共可读（Public read）：
  - `drills`, `weekly_challenges`, `challenge_submissions`（可选：是否公开 submissions 取决于产品规则）
- 私有（Private）：
  - `drill_attempts`（仅 owner 可读写）
- 投票（Voting）：
  - 仅登录用户可 insert
  - 通过 unique constraint 防止重复投票
