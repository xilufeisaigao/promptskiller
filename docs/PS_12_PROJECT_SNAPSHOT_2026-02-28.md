# [PromptSkiller] 项目快照（增量版，2026-02-28）

说明：该文档是对 [PS_11_PROJECT_SNAPSHOT_2026-02-28.md](./PS_11_PROJECT_SNAPSHOT_2026-02-28.md) 的新增快照，原快照保留不删。

> 注：该快照已被 [PS_13_PROJECT_SNAPSHOT_2026-02-28.md](./PS_13_PROJECT_SNAPSHOT_2026-02-28.md) 增量覆盖；本文件继续保留用于历史追溯。

## 快照信息

- 快照日期：2026-02-28（Asia/Shanghai）
- 快照来源：本地仓库 + 实时数据库查询
- 数据库连接时间：2026-02-28 13:17:49 UTC

## 本次增量范围（相对 PS_11）

### 1) 训练题型扩展完成（C1 + C2）

- `drills` 已支持 `drill_type`：
- `prompt_case`
- `code_case_multi`
- `build_sim_case`
- 新增 `drill_assets`，支持附件类型：`file` / `log` / `spec`
- 训练页支持附件 Tab：`题面` / `文件` / `日志`
- `build_sim_case` 支持结构化轮次产物展示：
- `summary`
- `changed_files`
- `patch_preview`
- `risk_notes`

### 2) 会话轮次与双反馈模式上线

- 新增 `drill_sessions` / `drill_session_rounds`
- 训练页支持反馈模式切换：
- `过程引导`：每轮立即展示评估
- `终局评分`：每轮入库但先隐藏，完成会话后统一展示
- 每轮评估可追溯、可回看；终局模式支持会话级复盘报告

### 3) 模块体系最小版上线（Sprint B）

- 新增 `drill_modules` / `drill_module_items`
- 新增种子模块（3 个）和模块题目关系（10 条）
- `/drills` 新增双视图：
- 题库视图（保留筛选）
- 模块视图（模块卡片 + 题目序列 + 进度）
- 支持 URL 参数：
- `/drills?view=modules`
- `/drills?module=<slug>`
- 训练提交后会本地记录已练题目，模块视图展示进度

### 4) 管理后台能力补全

- 题目新增/编辑支持 `drill_type`
- 后台可维护附件：新增 / 编辑 / 删除 `drill_assets`
- 保留原有能力：发布/下线/排期/提交统计

## 数据库迁移状态（最新）

- `001_init.sql`
- `002_weekly_challenges.sql`
- `003_drills_display_no.sql`
- `004_admin_rbac_and_schedule_slots.sql`
- `005_drill_types_and_assets.sql`
- `006_drill_sessions_and_rounds.sql`
- `007_drill_modules.sql`

## 数据库实时快照（本次采集）

- `public.drills = 8`
- `public.drill_assets = 10`
- `public.drill_modules = 3`
- `public.drill_module_items = 10`
- `public.drill_sessions = 0`
- `public.drill_session_rounds = 0`
- `public.drill_attempts = 0`
- `public.weekly_challenges = 1`

## 质量验证

本次增量已执行并通过：

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:status`

## 仍待后续迭代

- 模块进度当前为本地记录，尚未云端化到账号维度。
- 终局评分模式暂不支持中途查看单轮评分。
- `build_sim_case` 仍为虚拟工作区方案，尚未接入真实沙箱执行。
