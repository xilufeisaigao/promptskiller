-- [PromptSkiller] Daily follow-up seed (20260303)
-- Topic: mode-split-followups-noncoding-modules
-- Goal: add coach non-coding drills and publish coach/exam module paths.
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1) drills upsert (3 coach non-coding drills)
-- ============================================================================
insert into public.drills (
  id,
  display_no,
  title,
  body_md,
  difficulty,
  tags,
  drill_type,
  mode_visibility,
  capability_domain,
  exam_track,
  exam_time_limit_sec,
  exam_submission_limit,
  published_at
)
values
(
  'drill-coach-docs-prd-structured',
  221,
  'Coach：把模糊需求整理成可执行 PRD（文档场景）',
  $$
场景：你收到一句需求“做个会员增长活动页面”，信息严重不足。

任务：
1) 写给 AI 的提示词要先逼出缺失信息（目标人群、业务目标、上线时间、数据口径）。
2) 再要求 AI 产出一版结构化 PRD（背景/目标/范围/流程/验收）。
3) 输出格式必须是可直接评审的 Markdown 文档。

约束：
- 不能直接写“随便补齐”。
- 必须把“待确认项”单独列出来。
$$,
  2,
  array['coach','docs','prd','structured-output'],
  'prompt_case',
  array['coach'],
  'docs',
  null,
  null,
  null,
  now()
),
(
  'drill-coach-tools-os-automation-runbook',
  222,
  'Coach：让 AI 帮你操作系统并输出可执行 Runbook（工具场景）',
  $$
场景：你要让 AI 帮你在本机批量整理日志文件并生成统计报告。

任务：
1) 写提示词，要求 AI 先确认环境前提（系统、权限、目录结构、风险）。
2) 再输出“可执行步骤 + 命令 + 回滚方案”的 runbook。
3) 要求 AI 明确哪些命令可以直接执行，哪些需要人工确认。

约束：
- 必须强调“禁止危险命令（删除、覆盖）默认执行”。
- 输出包含失败排查分支。
$$,
  3,
  array['coach','tools','automation','runbook'],
  'prompt_case',
  array['coach'],
  'tools',
  null,
  null,
  null,
  now()
),
(
  'drill-coach-life-weekly-meal-budget-plan',
  223,
  'Coach：把生活目标转成可执行周计划（生活场景）',
  $$
场景：你希望控制每周饮食预算并保证营养均衡，但目标经常太笼统。

任务：
1) 写提示词让 AI 先追问你的约束（预算、口味、做饭时间、设备限制）。
2) 让 AI 输出“7 天可执行计划 + 采购清单 + 风险替代方案”。
3) 输出要包含验收标准（比如预算上限、执行难度、时间成本）。

约束：
- 不接受“只给建议，不给执行表格”。
- 必须区分“必须执行项”和“可选优化项”。
$$,
  2,
  array['coach','life','planning','execution'],
  'prompt_case',
  array['coach'],
  'life',
  null,
  null,
  null,
  now()
)
on conflict (id) do update set
  display_no = excluded.display_no,
  title = excluded.title,
  body_md = excluded.body_md,
  difficulty = excluded.difficulty,
  tags = excluded.tags,
  drill_type = excluded.drill_type,
  mode_visibility = excluded.mode_visibility,
  capability_domain = excluded.capability_domain,
  exam_track = excluded.exam_track,
  exam_time_limit_sec = excluded.exam_time_limit_sec,
  exam_submission_limit = excluded.exam_submission_limit,
  published_at = excluded.published_at;

-- ============================================================================
-- 2) drill_modules upsert (coach non-coding + exam foundation)
-- ============================================================================
insert into public.drill_modules (
  id,
  slug,
  title,
  description,
  level,
  estimated_minutes,
  cover_style,
  published_at
)
values
(
  'module-coach-non-coding-studio',
  'coach-non-coding-studio',
  'Coach Non-Coding Studio',
  '面向文档、工具自动化和生活任务的教练路径，训练“可执行表达”能力。',
  'starter',
  35,
  'paper-grid',
  now()
),
(
  'module-exam-coding-foundation',
  'exam-coding-foundation',
  'Exam Coding Foundation',
  '按 debug -> feature -> from_zero 组织的考试基础路径，用于集中刷题与验证。',
  'intermediate',
  55,
  'graph-grid',
  now()
)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  level = excluded.level,
  estimated_minutes = excluded.estimated_minutes,
  cover_style = excluded.cover_style,
  published_at = excluded.published_at,
  updated_at = now();

-- ============================================================================
-- 3) drill_module_items upsert
-- ============================================================================
insert into public.drill_module_items (module_id, drill_id, position)
values
('module-coach-non-coding-studio', 'drill-coach-docs-prd-structured', 1),
('module-coach-non-coding-studio', 'drill-coach-tools-os-automation-runbook', 2),
('module-coach-non-coding-studio', 'drill-coach-life-weekly-meal-budget-plan', 3),
('module-exam-coding-foundation', 'drill-bugfix-auth-token-race', 1),
('module-exam-coding-foundation', 'drill-feature-add-advanced-filters', 2),
('module-exam-coding-foundation', 'drill-greenfield-mini-kanban-saas', 3)
on conflict (module_id, drill_id) do update set
  position = excluded.position;

-- ============================================================================
-- 4) drill_schedule upsert (UTC 2026-03-04 coach daily)
-- ============================================================================
insert into public.drill_schedule (date, slot, drill_id)
values
('2026-03-04', 1, 'drill-coach-docs-prd-structured'),
('2026-03-04', 2, 'drill-coach-tools-os-automation-runbook'),
('2026-03-04', 3, 'drill-coach-life-weekly-meal-budget-plan')
on conflict (date, slot) do update set
  drill_id = excluded.drill_id;
