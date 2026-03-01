# [PromptSkiller] 项目快照（增量版，2026-03-01）

说明：该文档是对 [PS_13_PROJECT_SNAPSHOT_2026-02-28.md](./PS_13_PROJECT_SNAPSHOT_2026-02-28.md) 的继续增量快照，历史快照全部保留。

## 快照信息

- 快照日期：2026-03-01（Asia/Shanghai）
- 数据库连接时间：2026-03-01 08:34:41 UTC

## 本次增量（相对 PS_13）

### 1) 新增教学样板题类型 `template_case`

- `drills.drill_type` 增加新值 `template_case`。
- 样板题进入后是只读看板，不支持提交与评分。
- `/api/coach` 对样板题提交请求直接拒绝（400）。

### 2) 新增样板轮次表 `drill_template_rounds`

- 通过迁移 `009_template_case_rounds.sql` 上线。
- 每道样板题可配置固定轮次：
- `round_no`
- `version_label`
- `prompt_text`
- `teaching_notes_md`
- RLS 策略：公开读、管理员写。

### 3) 新增样板题前端看板

- 新组件：`components/TemplateDrillBoardClient.tsx`
- 路由接入：
- `/drills/[id]`
- `/drills/today`
- 看板布局：
- 左侧题面/附件
- 右侧固定 2-3 轮样板提示词与讲解重点

### 4) 管理后台与题库类型扩展

- 后台题型下拉新增：`template_case`。
- 题库卡片类型标签新增：`教学样板题`。

### 5) 内容运营规范与项目专属 skill

- 新增项目内 skill：
- `.codex/skills/daily-drill-content-ops/SKILL.md`
- 新增每日发布规范文档：
- `docs/PS_14_DAILY_CONTENT_OPS.md`
- 新增每日 seed 脚本：
- `scripts/new-daily-seed.ps1`
- 命名规范：`NNN_daily_YYYYMMDD_<topic>.sql`

### 6) 新增样板题种子

- `db/seed/010_template_case_samples.sql`
- 包含 1 道 `template_case` + 3 条固定迭代样板。

## 迁移与种子状态

已执行：

- `npm run db:migrate`（到 `009_template_case_rounds.sql`）
- `npm run db:seed`（到 `010_template_case_samples.sql`）
- `npm run db:status`

## 数据库当前行数（快照时刻）

- `drills = 15`
- `drill_assets = 16`
- `drill_template_rounds = 3`
- `drill_modules = 3`
- `drill_module_items = 15`
- `drill_schedule = 45`
- `drill_attempts = 6`
- `drill_user_progress = 5`
- `drill_sessions = 1`
- `drill_session_rounds = 1`
- `profiles = 3`
- `weekly_challenges = 1`

## 质量验证

本次变更已通过：

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:status`
