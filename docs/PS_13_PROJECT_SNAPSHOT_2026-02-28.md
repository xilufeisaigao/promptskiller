# [PromptSkiller] 项目快照（增量版，2026-02-28）

说明：该文档是对 [PS_12_PROJECT_SNAPSHOT_2026-02-28.md](./PS_12_PROJECT_SNAPSHOT_2026-02-28.md) 的继续增量快照，原有快照全部保留不删。

## 快照信息

- 快照日期：2026-02-28（Asia/Shanghai）
- 快照来源：本地仓库 + 实时数据库查询
- 数据库连接时间：2026-02-28 13:45:00 UTC

## 本次增量范围（相对 PS_12）

### 1) 反馈模式可配置 + 终局中途简版评分

- `/settings` 新增训练交互设置：
- 默认反馈模式（`过程引导` / `终局评分`）
- 终局模式中途查看开关
- 训练页在 `final_only` 会话中支持“查看本轮简版评分”：
- 仅显示总分与维度分
- 不显示缺失项、改进建议、参考答案

### 2) 评分体系升级为 6 维（总分 120）

- 新增维度：`process_control`（流程控制 / 迭代策略）
- 评分口径调整为：6 维 * 每维 0-20，总分 0-120
- 已同步更新：
- `lib/coach/types.ts`
- `lib/coach/schema.ts`
- `lib/coach/normalize.ts`
- `lib/coach/mock.ts`
- `components/CoachFeedbackView.tsx`
- 相关测试用例（normalize/build-sim/mock）

### 3) 用户云端进度聚合与题库实时刷新

- 新增迁移 `db/migrations/008_drill_user_progress.sql`
- 新增表 `drill_user_progress`，通过 `drill_attempts` 插入触发器自动 upsert：
- `attempt_count`
- `best_score`
- `last_score`
- 题库页登录态优先读取云端进度，提交后通过事件触发即时刷新。

### 4) 数据扩充（可直接验收）

- 新增种子：
- `db/seed/007_more_drill_samples.sql`
- `db/seed/008_more_drill_assets_samples.sql`
- `db/seed/009_module_schedule_and_demo_data.sql`
- 扩充后数据规模：
- 题目 `14`（含 `prompt_case` / `code_case_multi` / `build_sim_case`）
- 附件 `16`
- 模块关系 `15`
- 排期 `42`（未来 14 天 * 每天 3 题）
- 示例提交 `5`（管理员账号）

### 5) 脚本与可观测性补强

- 更新 `scripts/db.ps1 status` 输出，增加训练域核心表行数统计，便于一眼核对造数状态。

## 数据库迁移状态（最新）

- `001_init.sql`
- `002_weekly_challenges.sql`
- `003_drills_display_no.sql`
- `004_admin_rbac_and_schedule_slots.sql`
- `005_drill_types_and_assets.sql`
- `006_drill_sessions_and_rounds.sql`
- `007_drill_modules.sql`
- `008_drill_user_progress.sql`

## 数据库实时快照（本次采集）

- `drills = 14`
- `drill_assets = 16`
- `drill_modules = 3`
- `drill_module_items = 15`
- `drill_schedule = 42`
- `drill_attempts = 5`
- `drill_user_progress = 4`
- `drill_sessions = 0`
- `drill_session_rounds = 0`
- `profiles = 1`
- `weekly_challenges = 1`

## 质量验证

本次变更已执行并通过：

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:status`

补充冒烟（开发态 HTTP 路径检查）：

- `/`、`/drills`、`/drills?view=modules`、`/drills/today`、`/settings` 可访问并返回预期内容
- `/admin` 返回 `200`（具体权限内容依赖登录状态与 RLS）

## 结论

当前版本已达到“可验收 MVP”状态：

- 管理员后台可发布每日题、维护题库与附件、查看提交统计
- 普通用户可完整走通“选题 -> 提交 -> 反馈 -> 历史回看”
- 模块学习路径、复杂题展示、模拟构建题、多轮反馈模式均可运行
- 已提供可直接体验的演示数据，便于端到端验收
