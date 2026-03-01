# [PromptSkiller] 下一步设计流程（Post-MVP）

本文档用于承接 MVP 完成后的产品设计与信息架构升级，基于项目快照（2026-02-28）给出可执行方案。

## 1. 目标与问题定义

当前 MVP 已完成训练闭环与周赛闭环，但存在三个典型瓶颈：

- 题库信息密度不够高：用户只能按关键词搜索，难以按“能力维度/场景/发布时间”快速筛选。
- 题型表达偏单一：对“复杂代码协作场景”支持不足，难以覆盖多文件调试、联调定位、流程改进等真实任务。
- 首页与路径心智尚弱：用户进入后能看到功能，但不够快理解“训练方式 + 成长路径”。

下一阶段目标：

- 让题库成为“可导航的能力地图”，而非纯列表。
- 引入复杂代码题形态，提升高级用户训练价值。
- 形成从首页到训练页的统一叙事：开始 -> 提交 -> 反馈 -> 迭代。

## 2. 设计原则

- 信息先筛选后消费：先告诉用户“该练什么”，再让用户打开题目。
- 题目结构化：每道题必须可标注、可排序、可扩展。
- 复杂题可视化：多文件代码题需要附件区和上下文视图，不靠大段纯文本描述。
- MVP+1 继续小步快跑：优先做可落地的最小版本，不一次做成完整 OJ 平台。

## 3. 题库升级方案：Tag + 模块（Module）

### 3.1 Tag 体系（先做）

建议把标签拆为 4 类，支持前端多维筛选：

- 能力标签：`debug`、`testing`、`refactor`、`api-design`、`spec-writing`
- 场景标签：`frontend`、`backend`、`data`、`integration`、`incident`
- 产出标签：`prompt-only`、`test-plan`、`api-schema`、`review-checklist`
- 难度/阶段标签：`starter`、`intermediate`、`advanced`

前端筛选行为：

- 支持多选标签（AND 逻辑）。
- 支持快速排序：发布时间、难度、热门度（后续）。
- 支持“仅看新题”（例如 14 天内发布）。

### 3.2 模块体系（第二步）

模块不是标签，它是一组有顺序的题（Learning Path）。

- 示例模块：
- `Debug Fundamentals`（4-6 题）
- `Prompt for API Design`（3-5 题）
- `Code Refactor Lab`（5-8 题）

模块字段建议：

- `module_id`、`title`、`description`
- `level`（starter/intermediate/advanced）
- `published_at`、`estimated_minutes`
- `cover_style`（用于前端视觉区分）

模块价值：

- 给新用户清晰“从哪开始”的路线。
- 给老用户连续挑战感，而不是随机刷题。

## 4. 题型矩阵设计（保留普通题）

你的核心诉求是“继续往下做，但普通题要保留”，本方案采用四类题型并行：

### 4.1 Type A：`prompt_case`（普通题，默认主力）

- 形态：纯文本任务（现有题型）。
- 目标：持续覆盖基础能力（需求表达、验收标准、约束澄清等）。
- 价值：出题成本最低、迭代快、可高频发布。

### 4.2 Type B：`code_case_multi`（多文件调试/流程改进题）

- 形态：题面 + 多文件附件 + 日志线索。
- 目标：覆盖联调排障、流程重构、边界验证。
- 价值：贴近真实工程场景，提升高阶用户价值。
- 说明：该类型按样题逐步扩，不影响 `prompt_case` 主节奏。

### 4.3 Type C：`build_sim_case`（真实调用 AI 的模拟构建题）

- 形态：用户像“项目 owner”一样写提示词驱动 AI 迭代产出模块。
- 目标：训练“多轮协作 + 过程控制 + 质量门禁”能力。
- 风险：若做完整线上文件系统，复杂度与成本都偏高。

最小可行方案（先避开线上文件系统）：

- 使用“虚拟工作区快照”而非真实 FS：
- 每轮保存 `workspace_state_json`（文件树 + 文件内容摘要 + 关键日志）。
- AI 输出统一为结构化结果：`summary + changed_files + patch_preview + risk_notes`。
- 前端展示 patch 预览和文件变化，不做真正在线编译运行。
- 后端仍是真实调用大模型，但执行环境保持“模拟态”。

这能先验证题型价值，后续再决定是否引入真实沙箱执行。

### 4.4 Type D：`template_case`（教学样板题，只读看板）

- 形态：固定 2-3 轮示例提示词迭代（小白版 -> 改进版 -> 标准版）。
- 目标：用于教学视频演示“如何描述你想要的程序”。
- 交互：只读看板，不允许提交答题，不进入评分流程。
- 数据：通过 `drill_template_rounds` 存轮次正文与讲解说明。

### 4.5 `code_case_multi` 与 `build_sim_case` 的题目结构

- 任务描述：业务背景、现象、目标结果。
- 附件上下文：文件树、关键文件、日志/报错片段。
- 约束条件：不可改边界、性能预算、兼容要求。
- 验收标准：功能正确性、风险控制、可验证性。
- 提交要求：要求用户写“给 AI 的提示词”，并说明期望输出格式。

### 4.6 训练交互模式（落地你的设想）

在训练页增加“反馈模式”选项卡（默认可配置）：

- `过程引导模式`（Guided）
- 每轮模型输出后，立刻显示当前轮评估（round score + 问题点 + 下一步建议）。
- 用户在下一轮输入前看到纠偏建议。

- `终局评分模式`（Final-only）
- 每轮仍后台计算评估并存档，但前台只显示简短状态。
- 用户完成全部轮次后，一次性展示完整评分与复盘报告。

统一规则（两种模式都遵守）：

- 每次大模型输出后，都生成并保存“当前轮评估”。
- 区别仅在于“是否立即展示给用户”。

### 4.7 前端展示建议（简洁版）

- 训练页右侧新增 `反馈模式` 选项卡（过程引导 / 终局评分）。
- 左侧附件区保持 Tab 结构：`题面` / `文件` / `日志`。
- 中部保留当前 prompt 输入与提交流程，避免大改心智路径。
- UI 设计要求：保持简洁、信息层级清晰，避免过多视觉噪音。

## 5. 数据模型增量建议（按最小可行落地）

在不破坏现有 `drills` 的前提下做增量：

- `drills` 新字段：
- `drill_type` (`prompt_case` | `code_case_multi` | `build_sim_case` | `template_case`)
- `published_at`（已有，可强化前端排序）
- `module_id`（nullable）

- 新表 `drill_assets`（先服务 `code_case_multi`）：
- `id`、`drill_id`、`asset_kind`（`file`/`log`/`spec`）
- `path`（如 `src/api/client.ts`）
- `content_text`
- `order_no`

- 新表 `drill_sessions`（训练会话）：
- `id`、`user_id`、`drill_id`、`feedback_mode`（`guided`/`final_only`）
- `status`（`in_progress`/`completed`）
- `created_at`、`updated_at`

- 新表 `drill_session_rounds`（轮次记录）：
- `id`、`session_id`、`round_no`
- `user_prompt_text`
- `model_output_json`
- `round_eval_json`
- `eval_visible_to_user`（bool）
- `created_at`

- `build_sim_case` 扩展字段（可后加）：
- `workspace_state_json`（会话或轮次级）
- `changed_files_json`

- 新表 `drill_modules`：
- `id`、`slug`、`title`、`description`、`level`、`published_at`

- 新表 `drill_module_items`：
- `module_id`、`drill_id`、`position`

- 新表 `drill_template_rounds`：
- `drill_id`、`round_no`、`version_label`、`prompt_text`、`teaching_notes_md`

说明：仍优先用 SQL seed + 最小后台维护，不先上完整 CMS。

## 6. 分阶段实现节奏（更新版）

### Sprint A（1-1.5 周）：题库筛选升级

- 题库页增加多选 tag filter + 发布时间排序。
- 首页/题库展示“新题”与“模块入口（占位）”。
- 数据层先复用现有 `tags` + `published_at`。

验收标准：

- 用户可在 3 次点击内筛到“我今天要练的题”。

### Sprint B（1.5-2 周）：模块体系上线（最小版）

- 上线 `drill_modules` 与模块列表页（可先做 `/drills?module=...`）。
- 模块详情展示题目序列与完成进度（本地记录即可）。

验收标准：

- 新用户能直接从“模块入口”开始连续训练，不必每次手动选题。

### Sprint C1（2 周）：复杂代码题（先做）

- 落地 `code_case_multi` 数据结构 + `drill_assets`。
- 训练页支持附件 Tab（题面/文件/日志）和文件切换。
- 首批上线 3-5 道多文件联调题。

验收标准：

- 用户可在题面内直接查看多文件上下文并完成一次完整提交。

### Sprint C2（1.5-2 周）：AI 模拟构建题（验证版）

- 引入 `build_sim_case` 和会话轮次模型（`drill_sessions` + `drill_session_rounds`）。
- 训练页接入“反馈模式”选项卡（过程引导/终局评分）。
- 每轮模型输出后都生成轮次评估，按模式决定是否即时展示。
- 首批上线 1-2 道模拟构建题（不做真实在线 FS）。

验收标准：

- 两种反馈模式均可跑通完整训练闭环；
- 轮次评估可追溯、可回看；
- 不引入真实文件系统也能完成题型验证。

## 7. 首页与内容策略建议

- 首页应持续承载三件事：
- 价值陈述（为什么练）
- 训练路径（怎么练）
- 快速入口（现在就开始）

- 题目内容生产建议：
- 每周至少 1 道新题（含发布时间）
- 每两周补 1 个小模块（3-4 题）
- 每月补 1 道复杂代码题（多文件）

## 8. 已确认决策（2026-02-28）

1. `build_sim_case` 继续采用“虚拟工作区快照”方案，不接入真实线上文件系统（已按此落地）。
2. 反馈模式默认值做成可配置（`/settings` 可设 `过程引导` 或 `终局评分`）。
3. 终局评分模式支持“中途查看单轮简版评分”（仅展示分数，不给改进建议）。
4. 复杂题评分新增 `流程控制/迭代策略` 维度。
5. 模块体系默认全部公开，不做进度解锁。

## 9. 下一阶段建议（V2）

1. 增加管理员端“模块管理”能力（模块 CRUD、拖拽排序、发布开关）。
2. 在后台补“会话级统计”面板（按题型/模式拆分平均分、完成率、回访率）。
3. 为 `build_sim_case` 增加“多轮目标模板”（轮次目标/验收口径预设）。
4. 评估是否引入真实沙箱执行（仅针对少量高阶题，按成本灰度上线）。

## 10. 执行进度（按顺序，持续同步）

### Task 0：管理员功能补齐（已完成，2026-02-28）

已落地：

- 管理员后台支持编辑题目（标题/难度/标签/题面/发布时间）。
- 管理员后台支持题目下线与恢复发布（`published_at` 控制）。
- 管理员后台支持批量排期（按起始题轮转生成多天 `date + slot` 题单）。

验收点：

- 非管理员账号无法访问后台能力。
- 管理员可在同页完成新增/编辑/发布/下线/排期/统计查看。

### Task 1：标签 taxonomy 与模块命名规则（已完成，2026-02-28）

本轮确定并执行的规则：

- 标签先维持扁平字符串存储（兼容现有 `text[]`），按 4 类维护词表：能力/场景/产出/阶段。
- 模块命名采用英语短语 + 等级标记（如 `Debug Fundamentals` / `INTERMEDIATE`）。
- 在首页与题库先展示“模块入口占位”，避免阻塞筛选能力上线。

### Task 2：Sprint A 题库筛选升级（已完成，2026-02-28）

已落地：

- 题库支持标签多选（AND 逻辑）。
- 题库支持排序：题号、发布时间新到旧/旧到新、难度高到低/低到高。
- 支持“仅看新题”（14 天内）开关。
- 卡片展示发布时间与 `NEW` 标识。

验收点：

- 用户可在 3 次点击内筛到目标题目（搜索 + 标签 + 排序）。

### Task 3：`code_case_multi` 样题准备（已完成，2026-02-28）

已落地：

- 新增 seed 文件 `db/seed/003_code_case_samples.sql`。
- 首批补充 2 道复杂代码题样例（多文件联调 / 流程改进）。
- 题目均带 `code-case` 与 `advanced` 等标签，便于筛选演示。

### Task 4：Sprint C1 数据模型与附件系统（已完成，2026-02-28）

已落地：

- 新增迁移 `db/migrations/005_drill_types_and_assets.sql`：
- `drills.drill_type`（`prompt_case` / `code_case_multi` / `build_sim_case`）
- 新表 `drill_assets` + RLS（公开读、管理员写）
- 新增 seed：
- `db/seed/004_build_sim_case_samples.sql`（首个 `build_sim_case`）
- `db/seed/005_drill_assets_samples.sql`（文件/日志/规格附件样例）
- 前端训练页接入附件 Tab：`题面 / 文件 / 日志`
- 后台接入题型字段与附件 CRUD（可直接维护附件内容与顺序）

验收点：

- 普通题保持可用（无附件时不受影响）。
- `code_case_multi` / `build_sim_case` 可展示结构化附件上下文。
- 管理员可在后台新增、编辑、删除附件。

### Task 5：Sprint C2 会话轮次与反馈模式（已完成，2026-02-28）

已落地：

- 新增迁移 `db/migrations/006_drill_sessions_and_rounds.sql`：
- `drill_sessions`（`feedback_mode` / `status` / `final_report_json`）
- `drill_session_rounds`（每轮 prompt / 模型输出 / 评估 / 可见性）
- 训练页新增反馈模式切换：
- `过程引导`：每轮立即展示评估
- `终局评分`：每轮入库但先隐藏，完成会话后统一展示
- 每轮模型输出后，评估都会保存到 `drill_session_rounds.round_eval_json`
- 终局模式支持“完成会话并生成终局评分报告”

验收点：

- 两种反馈模式均可完整跑通训练闭环。
- 轮次评估可追溯（记录在会话与轮次表中）。
- 终局评分模式下，评估在会话完成前不会提前泄露。

### Task 6：`build_sim_case` 结构化产物展示（已完成，2026-02-28）

已落地：

- `/api/coach` 对 `build_sim_case` 返回结构化 `round_output`：
- `summary`
- `changed_files`
- `patch_preview`
- `risk_notes`
- 训练页右侧新增“本轮模拟产物”展示卡片（按轮次回看）
- 轮次记录中保存 `workspace_state_json` / `changed_files_json`（虚拟工作区快照方案）

说明：

- 当前版本仍按计划不接入真实线上文件系统，先验证题型与交互价值。

### Task 7：全量自测与数据库验证（已完成，2026-02-28）

执行结果：

- `npm run lint`：通过
- `npm run typecheck`：通过
- `npm test`：通过
- `npm run build`：通过
- `npm run db:migrate`：通过（含 005/006）
- `npm run db:seed`：通过（含 004/005）
- `npm run db:status`：通过（已出现 `drill_assets` / `drill_sessions` / `drill_session_rounds`）

### Task 8：Sprint B 模块体系实现（已完成，2026-02-28）

已落地：

- 新增迁移 `db/migrations/007_drill_modules.sql`。
- 上线模块表与关系表：`drill_modules` / `drill_module_items`。
- `/drills` 支持双视图：题库视图 + 模块视图。
- 支持 URL 直达：`/drills?view=modules`、`/drills?module=<slug>`。

验收点：

- 可查看模块卡片、题目序列、模块进度。
- 模块默认公开，对普通用户可见。

### Task 9：云端进度聚合（已完成，2026-02-28）

已落地：

- 新增迁移 `db/migrations/008_drill_user_progress.sql`。
- 新增表 `drill_user_progress`，并通过 `drill_attempts` 插入触发器自动聚合：
- `attempt_count`
- `best_score`
- `last_score`
- 题库页登录态优先读取云端进度，并在提交后事件触发即时刷新。

验收点：

- 登录用户在题库/模块视图可看到真实练习次数（非仅本地 DONE）。

### Task 10：终局模式中途查看（已完成，2026-02-28）

已落地：

- `/settings` 新增“训练交互设置”：
- 默认反馈模式（过程引导 / 终局评分）
- 终局模式中途查看开关
- 终局模式隐藏评估时，支持“查看本轮简版评分”：
- 仅展示总分与各维度分
- 不展示缺失项、歧义分析、改进建议、参考答案

验收点：

- 会话完成前不会泄露完整评估建议。
- 会话完成后仍可查看完整复盘。

### Task 11：评分维度升级（已完成，2026-02-28）

已落地：

- 评分新增 `process_control`（流程控制/迭代策略）。
- 评分总分口径更新为 `0-120`（6 维，每维 `0-20`）。
- 同步更新：
- schema（Zod + OpenAI JSON schema）
- mock 评分与归一化逻辑
- 前端评分展示
- 测试用例

验收点：

- 新旧评分 payload 均可兼容解析。
- 新维度在训练页与简版评分中可见。

### Task 12：数据扩充与演示场景（已完成，2026-02-28）

已落地：

- 新增种子：
- `db/seed/007_more_drill_samples.sql`
- `db/seed/008_more_drill_assets_samples.sql`
- `db/seed/009_module_schedule_and_demo_data.sql`
- 题库扩展到 `14` 题（保留普通题主力，同时扩展复杂题与模拟题）。
- 自动生成未来 14 天排期（`42` 条 `date + slot`）。
- 写入管理员示例提交记录，便于后台直接验收统计功能。

验收点：

- 开箱可演示：题库筛选、模块学习、今日排期、后台统计。

### Task 13：收口验证（已完成，2026-02-28）

执行结果：

- `npm run lint`：通过
- `npm run typecheck`：通过
- `npm test`：通过
- `npm run build`：通过
- `npm run db:migrate`：通过（含 008）
- `npm run db:seed`：通过（含 007/008/009）
- `npm run db:status`：通过（`drills=14`、`drill_assets=16`、`drill_schedule=42`、`drill_attempts=5`）

### Task 14：教学样板题（`template_case`）上线（已完成，2026-03-01）

需求背景：

- 面向 0 基础教学视频，需要固定 2-3 轮提示词迭代样板。
- 该题型是看板，不允许用户交互答题。

已落地：

- 新增迁移 `db/migrations/009_template_case_rounds.sql`：
- 扩展 `drills.drill_type` 新值：`template_case`
- 新表 `drill_template_rounds`（样板轮次内容）
- 前端新增只读看板组件（样板题进入后不显示输入提交区）：
- `/drills/[id]` 与 `/drills/today` 自动识别 `template_case`
- 左侧保留题面/附件，上侧右侧展示固定轮次样板
- API 防护：`/api/coach` 对 `template_case` 返回只读错误，避免误提交流程
- 后台题型下拉新增 `template_case`

验收点：

- 样板题可展示 2-3 轮固定 prompt 迭代与讲解说明。
- 样板题页面不支持提交与评分操作。

### Task 15：每日发题规范与项目专属 Skill（已完成，2026-03-01）

已落地：

- 新增项目内 skill：
- `.codex/skills/daily-drill-content-ops/SKILL.md`
- 新增每日发布规范文档：
- `docs/PS_14_DAILY_CONTENT_OPS.md`
- 新增脚本：
- `scripts/new-daily-seed.ps1`
- 自动生成命名规范文件：`NNN_daily_YYYYMMDD_<topic>.sql`
- 新增样板题种子：
- `db/seed/010_template_case_samples.sql`

验收点：

- 可按固定流程每天发布“样板题 + 练习题”。
- SQL 命名、执行顺序与幂等写法有统一标准。

### Task 16：模块分类页 V2（按题型/标签/模块分面）（已完成，2026-03-01）

设计文档：

- `docs/PS_16_MODULE_CLASSIFICATION_V2.md`

已落地：

- `/drills` 新增“模块化分类导航”区块：
- 左侧分面筛选：练习状态（全部/已练/未练）、难度分层、题型分层。
- 右侧专题发现：按题型专题 / 按标签专题双模式切换。
- 题库筛选逻辑升级：
- 题型多选过滤
- 难度多选过滤
- 练习状态过滤
- 模块视图新增等级过滤（Starter/Intermediate/Advanced）。
- 标签筛选区显示题量，并展示当前筛选条件数。

验收点：

- 用户可按“题型 + 难度 + 练习状态 + 标签”组合快速缩小题集。
- 模块路径仍可用，并支持按等级快速定位。

执行结果：

- `npm run lint`：通过
- `npm run typecheck`：通过
- `npm test`：通过
- `npm run build`：通过
