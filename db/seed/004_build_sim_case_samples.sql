-- [PromptSkiller] Seed build-sim drill samples (idempotent)

insert into public.drills (id, display_no, title, body_md, difficulty, tags, drill_type, published_at)
values
(
  'drill-build-sim-alert-center-v1',
  8,
  'AI 模拟构建：搭一个最小可用告警中心模块',
  $$
你现在是一个产品 owner，需要通过“多轮提示词”指导 AI 逐步搭建一个告警中心模块（不要求真实运行，仅要求结构化产物可评估）。

目标：
1) 第一轮先产出信息架构和目录结构；
2) 第二轮产出核心数据流与关键接口约定；
3) 第三轮补齐风险控制与验收清单。

任务约束：
- 只能改动 `apps/web` 和 `packages/shared` 下文件；
- 不允许引入新基础设施（消息队列、新数据库）；
- 输出必须包含“改动文件列表 + patch 预览 + 风险说明”；
- 每轮都要可回滚，避免一次性大改。

考察重点：
- 你是否能把任务拆成可执行轮次；
- 你是否能把 AI 输出约束成可审查的格式；
- 你是否在每轮设置了可验证验收标准。
$$,
  4,
  array['build-sim','module-design','owner-flow','advanced'],
  'build_sim_case',
  now()
)
on conflict (id) do update set
  display_no = excluded.display_no,
  title = excluded.title,
  body_md = excluded.body_md,
  difficulty = excluded.difficulty,
  tags = excluded.tags,
  drill_type = excluded.drill_type,
  published_at = excluded.published_at;
