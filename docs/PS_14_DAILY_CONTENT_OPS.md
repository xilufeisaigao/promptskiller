# [PromptSkiller] 每日内容发布规范（题目创建与上架）

本文档定义你每天发布“样板题 + 练习题”时的统一流程、SQL 命名标准和执行方式。

## 1. 已提供的项目专属 Skill

已创建项目内 skill（按 skill-creator 方式落地）：

- `.codex/skills/daily-drill-content-ops/SKILL.md`

触发场景：

- 新增题目（四种题型）
- 发布每日题单
- 批量补充附件与样板轮次
- 规范化 SQL 命名与 idempotent upsert

## 2. 当前支持题型与建题要求

### 2.1 `prompt_case`（普通练习题）

最小字段：

- `drills.id`
- `title`
- `body_md`
- `difficulty`
- `tags`
- `published_at`

特点：

- 无需附件即可发布。
- 进入训练页后可提交、评分、历史回看。

### 2.2 `code_case_multi`（多文件联调题）

除主题目外，建议至少补：

- `drill_assets` 中 2+ `file`
- `drill_assets` 中 1+ `log/spec`

特点：

- 训练页左侧附件区可切 `题面 / 文件 / 日志`。
- 支持真实工程上下文演练。

### 2.3 `build_sim_case`（模拟构建题）

建议：

- 题面按轮次描述目标（第 1 轮/第 2 轮/第 3 轮）。
- 配 `file/spec` 附件保证上下文稳定。

特点：

- 用户可提交多轮提示词。
- 展示结构化模拟产物（`summary/changed_files/patch_preview/risk_notes`）。

### 2.4 `template_case`（教学样板题，新增）

除主题目外，必须补：

- `drill_template_rounds` 至少 2-3 条

每条轮次字段：

- `round_no`
- `version_label`
- `prompt_text`
- `teaching_notes_md`（建议填写）

特点：

- 进入题目后是只读看板，不支持提交答题。
- 用于视频教学中展示“第 1 版 -> 第 2 版 -> 标准版”。

## 3. 每日 SQL 命名标准（必须遵守）

每日发布文件统一放在 `db/seed/`，命名格式：

- `NNN_daily_YYYYMMDD_<topic>.sql`

规则：

- `NNN`：3 位递增序号（保证 `npm run db:seed` 按顺序执行）
- `YYYYMMDD`：发布日期（UTC 规则）
- `topic`：小写 + 连字符

示例：

- `011_daily_20260301_beginner-template-and-api.sql`

## 4. 自动生成每日 seed 文件

已提供脚本：

- `scripts/new-daily-seed.ps1`

用法：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/new-daily-seed.ps1 -BatchName beginner-template-and-api
```

输出：

- 自动创建下一个序号的 seed 文件
- 自动带标准模板注释（drills/assets/template_rounds/schedule 四段）

## 5. 每日发布推荐流程（固定）

1. 生成 daily seed 文件（脚本自动命名）。
2. 在同一个 SQL 文件里完成当天批次：
- 题目 upsert
- 附件 upsert（如需）
- 样板轮次 upsert（如需）
- 当日排期 upsert（slot 1/2/3）
3. 执行并验证：
- `npm run db:seed`
- `npm run db:status`
4. 页面验收：
- `/drills`
- `/drills/today`
- 样板题固定链接 `/drills/<template-case-id>`

## 6. SQL 写法硬约束（避免重复发布出错）

必须使用幂等写法：

- `drills`: `on conflict (id) do update`
- `drill_assets`: `on conflict (drill_id, asset_kind, path) do update`
- `drill_template_rounds`: `on conflict (drill_id, round_no) do update`
- `drill_schedule`: `on conflict (date, slot) do update`

禁止：

- 在 daily 文件中使用 `delete` 做覆盖式清库
- 使用不可重跑的随机主键逻辑破坏幂等性

## 7. 每日发布最小组合建议（面向你的视频节奏）

建议每天一个批次包含：

- 1 道 `template_case`（教学样板）
- 2-4 道普通/复杂练习题（`prompt_case` + 可选 `code_case_multi`）
- 3 条当日题单排期（slot 1/2/3）

这样视频里的“讲解样板”与站内“可实操练习”能同步上线。
