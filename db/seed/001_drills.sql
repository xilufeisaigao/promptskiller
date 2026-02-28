-- [PromptSkiller] Seed drills (idempotent)

insert into public.drills (id, display_no, title, body_md, difficulty, tags, published_at)
values
(
  'drill-debug-minimal-repro',
  1,
  '把 Bug 描述成可复现的最小问题',
  $$
你遇到一个 bug：某个表单提交后页面偶尔会卡死，刷新才恢复。

约束：
- 你不能贴出任何公司机密、账号密码、API key。
- 你要让 AI 能一步步定位问题，所以需要给出复现步骤、期望结果、实际结果、环境信息。

目标：
- 写一段你会发给 AI 的提示词，让 AI 先提出澄清问题，再给出排查路径。

提示：你可以要求 AI 输出一个排查 checklist，以及你应该补充的日志/截图/信息。
$$,
  2,
  array['debug','communication'],
  now()
),
(
  'drill-write-tests',
  2,
  '让 AI 写测试之前先把验收标准讲清楚',
  $$
场景：你有一个函数 `parsePrice(input: string)`，输入类似 '12.30' 或 '$12.30'，输出 number。

约束：
- 不考虑国际化（只考虑 '.' 小数点）。
- 遇到非法输入要抛出错误。

目标：
- 写提示词让 AI 先列出边界情况，再生成单元测试用例（不要直接给实现）。

你要明确：哪些算合法，哪些算非法，错误信息是否需要固定等。
$$,
  3,
  array['testing','spec'],
  now()
),
(
  'drill-refactor-with-constraints',
  3,
  '要求重构但保持行为不变（并给出验证方式）',
  $$
场景：你有一段“能跑但很丑”的业务逻辑代码，你希望 AI 帮你重构，让它：
- 更易读
- 更容易测试
- 更少副作用

约束：
- 行为必须不变（包含边界情况）。
- 需要先给重构计划，再给代码。
- 需要提供验证方案（比如测试策略）。

目标：
- 写一段提示词，要求 AI 先问清楚输入输出与边界，再给分步重构方案。
$$,
  4,
  array['refactor','quality'],
  now()
),
(
  'drill-api-design',
  4,
  '设计一个 API：把需求拆成接口 + 数据结构',
  $$
场景：你要做一个“每日训练题”功能，需要：
- 获取今日训练题
- 提交一次尝试（prompt + coach feedback）
- 获取某题的历史尝试

目标：
- 写提示词让 AI 输出：REST API 设计（路径、方法、请求/响应 body）、数据表草案、以及 RLS 关键点。

约束：
- 输出必须是 Markdown，并且每个接口都要有示例请求/响应 JSON。
$$,
  4,
  array['api','design'],
  now()
),
(
  'drill-acceptance-criteria',
  5,
  '把“我要一个页面”讲成可验收的任务',
  $$
场景：你要让 AI 帮你做一个简单页面，但你发现你经常只说“做个页面”，结果越做越偏。

目标：
- 写提示词，要求 AI 先复述需求，再输出一个验收标准清单，然后再开始产出页面代码。

提示：你可以指定布局、交互状态、移动端适配、无障碍（a11y）等。
$$,
  2,
  array['frontend','spec'],
  now()
)
on conflict (id) do update set
  title = excluded.title,
  body_md = excluded.body_md,
  difficulty = excluded.difficulty,
  tags = excluded.tags,
  published_at = excluded.published_at;
