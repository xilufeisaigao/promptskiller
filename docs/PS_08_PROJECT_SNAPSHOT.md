# [PromptSkiller] 项目快照（2026-02-28）

本文档用于记录当前仓库的真实实现状态，避免“文档还是规划、代码已经迭代”的信息偏差。

## 快照信息

- 快照日期：2026-02-28（Asia/Shanghai）
- 代码基线：快照采集时工作区为 `main` clean（后续以实时 `git status` 为准）
- 数据库连通检查：已通过（命令 `npm run db:status`）
- 数据库状态时间：2026-02-28 06:49:15 UTC

## 当前已实现功能

### 1) 全局导航与页面结构

- `/`：首页，包含产品说明与快速入口（今日训练、题库、配置）。
- `/auth`：登录/注册页（Supabase Auth）。
- `/settings`：模型配置页（Mock/真实模型切换，API Key 测试并保存）。
- `/drills`：题库页，支持按题号/标题/slug/tag 搜索。
- `/drills/today`：今日训练页，按 UTC 日期推荐 3 题，可切换题目。
- `/drills/[id]`：训练题固定链接页，便于分享与复盘。
- `/challenges`：周赛列表页。
- `/challenges/[slug]`：周赛详情页，包含提交与投票入口。
- `/submissions/[id]`：作品公开分享页。
- `/profile`：个人统计页（训练次数、平均分、连续天数、周赛获赞）。

### 2) 训练流程（Drills）

- 题目来源：优先读取数据库 `public.drills`，失败时 fallback 本地常量题库。
- 题目展示：支持全站递增题号 `display_no`，前端显示 `PS-001` 样式。
- 今日推荐：`/drills/today` 默认展示当日推荐 3 题（UTC 基准）。
- 训练交互：左侧题面 + 输入区，右侧反馈 + 历史记录。
- 训练交互：支持左右分栏拖拽和右侧上下分区拖拽，比例会保存到 LocalStorage。
- 训练交互：提交后显示打字机式“反馈生成中”状态。
- 反馈展示：总分 `score_total`（0-100）与 5 个维度分数同步展示。
- 反馈展示：缺失项、歧义点、补充问题按序渐进显示。
- 反馈展示：参考答案默认隐藏，用户点击后再显示。

### 3) AI 教练模式

- 默认模式：Mock（无 Key 即可完整跑通流程）。
- 真实模式：用户在 `/settings` 配置后启用。
- 当前支持服务商：`openai`。
- 当前支持服务商：`bailian`（阿里云百炼兼容模式）。
- 当前支持服务商：`custom`（自定义 OpenAI 兼容网关）。
- 连接测试：`POST /api/openai/test-key`，连通才保存配置。
- 训练调用：`POST /api/coach`，有 key 走真实模型，无 key 自动回落 Mock。

### 4) 周赛流程

- 周赛列表与详情可浏览。
- 登录用户可提交作品（`artifact_url` + `artifact_type` + `prompt_log_md` + `notes`）。
- 当前规则：每个挑战每个用户最多 1 次提交（数据库唯一约束保证）。
- 投票支持点赞/取消点赞切换，禁止给自己投票（RLS + 约束）。
- 提交与投票计数可在详情和分享页查看。

### 5) 用户与进度

- 未登录用户可本地练习，历史写入 LocalStorage。
- 登录后提交写入数据库 `drill_attempts`，支持跨设备查看。
- 个人主页统计：训练总次数（`drill_attempts`）。
- 个人主页统计：近 200 次平均分。
- 个人主页统计：UTC 连续训练天数（streak）。
- 个人主页统计：我的周赛提交与总获赞。

## 数据库快照与迁移状态

### 已有迁移

- `db/migrations/001_init.sql`：基础表（profiles、drills、drill_schedule、drill_attempts）+ RLS。
- `db/migrations/002_weekly_challenges.sql`：周赛表（weekly_challenges、challenge_submissions、submission_votes）+ 触发器 + RLS。
- `db/migrations/003_drills_display_no.sql`：`drills.display_no` 全站题号字段及序列。

### 已有种子数据

- `db/seed/001_drills.sql`：训练题 5 道。
- `db/seed/002_weekly_challenge.sql`：周赛 1 条（当前周）。

### 最近一次状态检查（2026-02-28）

- `public.drills`：5
- `public.weekly_challenges`：1
- `public.challenge_submissions`：0
- `public.submission_votes`：0
- 额外表说明：`public.notes` 为 Supabase 默认/历史示例表，非 PromptSkiller 核心依赖。

## 质量与运行命令

- `npm run db:status`：检查数据库连通与核心表行数。
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run dev`

## 当前已知缺口（下一阶段优先级）

- 缺少题库后台管理 UI（当前主要依赖 SQL seed/手工入库）。
- 缺少生产级限流与滥用防护策略（AI 调用成本控制仍需加强）。
- 缺少系统化运营看板（留存、题目完成率、迭代次数等指标仍以基础统计为主）。
- 缺少部署与发布流程文档（建议补一份 `PS_09_DEPLOYMENT.md`）。
