-- [PromptSkiller] Seed extra MVP drills (idempotent)

insert into public.drills (id, display_no, title, body_md, difficulty, tags, drill_type, published_at)
values
(
  'drill-incident-postmortem-prompt',
  9,
  '事故复盘题：把一次线上故障拆成可执行复盘模板',
  $$
你要让 AI 帮你输出一份事故复盘模板，背景如下：
- 线上出现 25 分钟不可用，影响支付下单。
- 已恢复，但团队对根因和行动项存在分歧。

目标：
1) 先让 AI 列出你还缺哪些事实数据；
2) 再输出复盘模板（时间线、根因、影响面、修复动作、防再发动作）；
3) 要求 AI 给出“下周必须完成”的 3 条硬行动项。

约束：
- 复盘内容必须可验证，不允许空话；
- 行动项要有 owner、截止日期、验收标准；
- 输出格式要求 Markdown 小标题 + 表格。
$$,
  3,
  array['incident','postmortem','spec-writing','intermediate'],
  'prompt_case',
  now() - interval '2 days'
),
(
  'drill-api-contract-review-gateway',
  10,
  '接口评审题：网关改造前先做契约风险审查',
  $$
你要评审一个“统一 API 网关改造”提案，准备让 AI 给出审查结论。

目标：
- 先输出接口契约风险清单（字段变更、兼容性、幂等性、错误码）；
- 再输出“可灰度发布”的改造步骤；
- 最后输出回滚条件与观测指标。

约束：
- 不允许破坏现有客户端；
- 必须覆盖版本兼容策略；
- 必须给出验收用例（成功/失败/超时）。
$$,
  4,
  array['api-design','integration','review-checklist','advanced'],
  'prompt_case',
  now() - interval '4 days'
),
(
  'drill-test-plan-regression-release',
  11,
  '测试计划题：发布前回归范围如何定义',
  $$
你要发布一个用户中心模块的重构版本，需要请 AI 帮你产出测试计划。

目标：
1) 先按风险级别拆分测试范围（P0/P1/P2）；
2) 输出最小回归集与全量回归集；
3) 输出发布门禁标准（阻断条件）。

约束：
- 回归执行窗口只有 2 小时；
- 测试计划必须覆盖登录、鉴权、资料更新、权限变更；
- 输出要包含测试用例表格与执行顺序。
$$,
  3,
  array['testing','release','test-plan','intermediate'],
  'prompt_case',
  now() - interval '7 days'
),
(
  'drill-refactor-boundary-dependency',
  12,
  '重构边界题：限定依赖范围做渐进式改造',
  $$
你准备对一个老模块做重构，但担心改动过大。请写给 AI 的提示词，让它先做依赖边界分析，再给渐进式改造方案。

目标：
- 先识别“必须保留”的外部依赖和接口契约；
- 再给 3 阶段改造计划（每阶段可单独上线）；
- 给出每阶段验证策略与回滚路径。

约束：
- 不能一次性替换整个模块；
- 不能新增基础设施组件；
- 需要明确每阶段 DoD（Definition of Done）。
$$,
  4,
  array['refactor','dependency','workflow','advanced'],
  'prompt_case',
  now() - interval '9 days'
),
(
  'drill-codecase-trace-gap-observability',
  13,
  '多文件排障题：补齐链路追踪断点并定位慢查询',
  $$
你接手一个服务链路，发现 trace 在网关到订单服务之间偶发断点，慢查询告警无法追踪到具体请求。

请你写给 AI 的提示词，要求它：
1) 先提出需要补充的追踪上下文；
2) 再给出多文件改造路径；
3) 最终输出最小改动 patch 与验证方案。

附件包括：
- `gateway/middleware/trace.ts`
- `services/order/handler.ts`
- `services/order/repo.ts`
- `logs/trace-missing.log`

约束：
- 不改变数据库 schema；
- 不增加新中间件框架；
- 必须输出观测指标清单（trace/span/slow-query）。
$$,
  5,
  array['code-case','multi-file-debug','observability','advanced'],
  'code_case_multi',
  now() - interval '1 days'
),
(
  'drill-build-sim-permission-center-v1',
  14,
  'AI 模拟构建：搭建权限中心最小版本（多轮）',
  $$
你是项目 owner，要通过多轮提示词驱动 AI 搭建权限中心模块（模拟态，不要求真实运行）。

目标：
1) 第一轮产出权限模型和目录结构；
2) 第二轮产出核心接口约定与审计日志字段；
3) 第三轮补齐发布策略、回滚路径和验收标准。

约束：
- 只能改动 `apps/admin` 和 `packages/shared`；
- 不允许引入新数据库；
- 每轮输出必须包含 changed_files + patch_preview + risk_notes。
$$,
  5,
  array['build-sim','module-design','process-control','advanced'],
  'build_sim_case',
  now() - interval '1 days'
)
on conflict (id) do update set
  display_no = excluded.display_no,
  title = excluded.title,
  body_md = excluded.body_md,
  difficulty = excluded.difficulty,
  tags = excluded.tags,
  drill_type = excluded.drill_type,
  published_at = excluded.published_at;
