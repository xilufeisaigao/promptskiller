-- [PromptSkiller] Seed advanced code-case drills (idempotent)

insert into public.drills (id, display_no, title, body_md, difficulty, tags, drill_type, published_at)
values
(
  'drill-codecase-multi-file-debug-auth-refresh',
  6,
  '多文件联调：定位 Token 刷新导致的 401 循环',
  $$
你接手一个前端 + BFF 项目，最近线上出现“用户登录后偶发 401，并无限重试刷新 token”的问题。

请你写给 AI 的提示词，要求 AI：
1) 先基于现象提出澄清问题；
2) 再给出多文件排查路径；
3) 最后输出最小改动的修复方案和验证清单。

附件结构（只读）：
- `src/auth/client.ts`
- `src/auth/refresh.ts`
- `src/api/http.ts`
- `server/middleware/session.ts`
- `logs/auth-refresh.log`

限制条件：
- 不能改动数据库 schema；
- 不能移除 token 刷新机制；
- 要保持现有接口契约不变；
- 需要给出回归验证步骤（至少 8 条）。

请重点考察：
- 排查顺序是否可执行；
- 是否覆盖并发/过期边界；
- 是否明确了可观测性（日志/指标）要求。
$$,
  5,
  array['code-case','multi-file-debug','backend','integration','advanced'],
  'code_case_multi',
  now()
),
(
  'drill-codecase-workflow-refactor-order-pipeline',
  7,
  '流程改进：重构订单流水线并保持行为一致',
  $$
你在维护一个订单处理流水线，涉及校验、库存预占、支付、异步通知四个阶段。
现状是逻辑分散在多个文件，异常处理重复且难以测试。

请你写给 AI 的提示词，要求 AI：
1) 先抽象当前流程图（按阶段）；
2) 再给出“行为不变”的重构计划；
3) 输出分步改造策略（每步含风险与回滚）；
4) 输出测试补强方案（单测 + 集成 + 故障注入）。

附件结构（只读）：
- `src/order/pipeline.ts`
- `src/order/steps/*.ts`（4 个阶段）
- `src/order/errors.ts`
- `tests/order/pipeline.int.test.ts`
- `logs/order-failures.log`

限制条件：
- 不允许更改 API 响应字段；
- 不允许引入新中间件框架；
- 改动必须可分批发布；
- 需要定义验收标准（功能、性能、稳定性）。

请重点考察：
- 重构计划是否阶段化；
- 是否明确了等价行为验证方式；
- 是否覆盖高并发/重试/幂等等边界。
$$,
  5,
  array['code-case','workflow-refactor','backend','testing','advanced'],
  'code_case_multi',
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
