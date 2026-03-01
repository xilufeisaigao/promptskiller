-- [PromptSkiller] Seed drill modules (idempotent)

insert into public.drill_modules (id, slug, title, description, level, estimated_minutes, cover_style, published_at)
values
(
  'module-debug-fundamentals',
  'debug-fundamentals',
  'Debug Fundamentals',
  '从最小复现、日志补齐到排查路径表达，建立稳定的调试提示词能力。',
  'starter',
  35,
  'sand-grid',
  now()
),
(
  'module-prompt-api-design',
  'prompt-api-design',
  'Prompt for API Design',
  '围绕 API 拆解、数据结构和权限约束，训练可交付的接口设计表达。',
  'intermediate',
  45,
  'ocean-line',
  now()
),
(
  'module-code-refactor-lab',
  'code-refactor-lab',
  'Code Refactor Lab',
  '聚焦多文件联调、行为等价重构和模拟构建协作，面向真实工程场景。',
  'advanced',
  60,
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

insert into public.drill_module_items (module_id, drill_id, position)
values
('module-debug-fundamentals', 'drill-debug-minimal-repro', 1),
('module-debug-fundamentals', 'drill-write-tests', 2),
('module-debug-fundamentals', 'drill-acceptance-criteria', 3),

('module-prompt-api-design', 'drill-api-design', 1),
('module-prompt-api-design', 'drill-write-tests', 2),
('module-prompt-api-design', 'drill-refactor-with-constraints', 3),

('module-code-refactor-lab', 'drill-codecase-multi-file-debug-auth-refresh', 1),
('module-code-refactor-lab', 'drill-codecase-workflow-refactor-order-pipeline', 2),
('module-code-refactor-lab', 'drill-build-sim-alert-center-v1', 3),
('module-code-refactor-lab', 'drill-refactor-with-constraints', 4)
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
