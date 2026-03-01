-- [PromptSkiller] Seed module mapping, schedule, and demo records (idempotent)

-- Expand module sequences with newly seeded drills.
insert into public.drill_module_items (module_id, drill_id, position)
values
('module-debug-fundamentals', 'drill-incident-postmortem-prompt', 4),
('module-prompt-api-design', 'drill-api-contract-review-gateway', 4),
('module-prompt-api-design', 'drill-test-plan-regression-release', 5),
('module-code-refactor-lab', 'drill-codecase-trace-gap-observability', 5),
('module-code-refactor-lab', 'drill-build-sim-permission-center-v1', 6)
on conflict (module_id, drill_id) do update set
  position = excluded.position;

-- Keep shortcut module_id aligned with the first module appearance.
update public.drills as d
set module_id = x.module_id
from (
  select distinct on (drill_id)
    drill_id,
    module_id
  from public.drill_module_items
  order by drill_id, position asc
) as x
where d.id = x.drill_id;

-- Build a rolling 14-day schedule (3 slots/day) from published drills.
with published_ids as (
  select array_agg(id order by coalesce(display_no, 999999), id) as ids
  from public.drills
  where published_at is not null
),
days as (
  select
    (current_date + gs)::date as date_utc,
    gs as day_offset
  from generate_series(0, 13) as gs
),
slots as (
  select 1 as slot
  union all select 2
  union all select 3
)
insert into public.drill_schedule (date, slot, drill_id)
select
  d.date_utc,
  s.slot,
  p.ids[((d.day_offset * 3 + s.slot - 1) % array_length(p.ids, 1)) + 1]
from published_ids p
cross join days d
cross join slots s
where array_length(p.ids, 1) > 0
on conflict (date, slot) do update set
  drill_id = excluded.drill_id;

-- Optional demo data for the seeded admin account.
do $$
declare
  admin_uid uuid := '9f3c5f3a-6d5f-4b9f-9a88-2f9f8db6a4e1'::uuid;
begin
  if exists (select 1 from auth.users where id = admin_uid) then
    insert into public.profiles (id, is_admin)
    values (admin_uid, true)
    on conflict (id) do update set
      is_admin = true;

    delete from public.drill_attempts
    where user_id = admin_uid
      and prompt_text like '[seed] %';

    delete from public.drill_user_progress
    where user_id = admin_uid
      and drill_id in (
        'drill-debug-minimal-repro',
        'drill-codecase-multi-file-debug-auth-refresh',
        'drill-build-sim-alert-center-v1',
        'drill-codecase-trace-gap-observability'
      );

    insert into public.drill_attempts (
      user_id,
      drill_id,
      prompt_text,
      coach_mode,
      coach_feedback,
      score_total,
      created_at
    )
    values
    (
      admin_uid,
      'drill-debug-minimal-repro',
      '[seed] round1: 先给最小复现和环境信息',
      'mock',
      jsonb_build_object(
        'score_total', 78,
        'scores', jsonb_build_object(
          'context', 16,
          'constraints', 12,
          'output_format', 14,
          'acceptance_criteria', 12,
          'tests_and_edge_cases', 12,
          'process_control', 12
        ),
        'missing_items', jsonb_build_array('补充日志字段和复现频率'),
        'ambiguities', jsonb_build_array('“偶发”缺少量化定义'),
        'suggested_questions_to_answer', jsonb_build_array('发生概率是多少？', '可稳定复现的最小步骤是什么？'),
        'rewrite_example', null
      ),
      78,
      now() - interval '3 days'
    ),
    (
      admin_uid,
      'drill-debug-minimal-repro',
      '[seed] round2: 增加约束和验收口径',
      'mock',
      jsonb_build_object(
        'score_total', 95,
        'scores', jsonb_build_object(
          'context', 17,
          'constraints', 16,
          'output_format', 16,
          'acceptance_criteria', 16,
          'tests_and_edge_cases', 15,
          'process_control', 15
        ),
        'missing_items', jsonb_build_array('可增加失败样例'),
        'ambiguities', jsonb_build_array(),
        'suggested_questions_to_answer', jsonb_build_array('是否要求给出观测指标模板？'),
        'rewrite_example', null
      ),
      95,
      now() - interval '2 days'
    ),
    (
      admin_uid,
      'drill-codecase-multi-file-debug-auth-refresh',
      '[seed] codecase: 先定位循环刷新与并发竞态',
      'mock',
      jsonb_build_object(
        'score_total', 88,
        'scores', jsonb_build_object(
          'context', 15,
          'constraints', 14,
          'output_format', 14,
          'acceptance_criteria', 15,
          'tests_and_edge_cases', 15,
          'process_control', 15
        ),
        'missing_items', jsonb_build_array('补充回归验证步骤'),
        'ambiguities', jsonb_build_array('“最小改动”范围未限定'),
        'suggested_questions_to_answer', jsonb_build_array('需要覆盖哪些并发边界？'),
        'rewrite_example', null
      ),
      88,
      now() - interval '1 day'
    ),
    (
      admin_uid,
      'drill-build-sim-alert-center-v1',
      '[seed] build-sim: 三轮拆解并定义每轮验收',
      'mock',
      jsonb_build_object(
        'score_total', 102,
        'scores', jsonb_build_object(
          'context', 16,
          'constraints', 16,
          'output_format', 17,
          'acceptance_criteria', 17,
          'tests_and_edge_cases', 18,
          'process_control', 18
        ),
        'missing_items', jsonb_build_array(),
        'ambiguities', jsonb_build_array(),
        'suggested_questions_to_answer', jsonb_build_array('每轮失败时回滚口径是否明确？'),
        'rewrite_example', null
      ),
      102,
      now() - interval '12 hours'
    ),
    (
      admin_uid,
      'drill-codecase-trace-gap-observability',
      '[seed] observability: 补 trace 断点并定义指标',
      'mock',
      jsonb_build_object(
        'score_total', 97,
        'scores', jsonb_build_object(
          'context', 16,
          'constraints', 16,
          'output_format', 16,
          'acceptance_criteria', 16,
          'tests_and_edge_cases', 16,
          'process_control', 17
        ),
        'missing_items', jsonb_build_array('补充链路级回归检查'),
        'ambiguities', jsonb_build_array(),
        'suggested_questions_to_answer', jsonb_build_array('慢查询阈值如何定义？'),
        'rewrite_example', null
      ),
      97,
      now() - interval '6 hours'
    );
  end if;
end $$;
