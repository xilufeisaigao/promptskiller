-- [PromptSkiller] Daily batch seed (20260303)
-- Topic: mode-split-exam-coach-20pack
-- Goal: add 20 drills across four exam categories with coach/template variants.
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1) drills upsert (20 drills)
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
  'drill-template-ui-replica-kanban',
  201,
  '样板题：从图片复现任务看板页面（教学看板）',
  $$
这是教学样板题（只读）。目标是展示：如何把“看图还原页面”的需求说清楚。
你将看到 3 轮提示词迭代：小白描述 -> 有改进版本 -> 标准版本。
本题不支持提交，不进入评分流程。
$$,
  1,
  array['template','teaching','ui-replica','image'],
  'template_case',
  array['coach'],
  'coding',
  null,
  null,
  null,
  now()
),
(
  'drill-ui-replica-kanban-basic',
  202,
  'Exam：根据两张截图复现响应式任务看板',
  $$
任务：你会拿到桌面和移动端两张参考图。请写给 AI 的提示词，要求其直接输出可运行页面代码。

目标：
1) 复现三列看板布局（Todo / Doing / Done）。
2) 兼容 1280 宽桌面与 720 宽移动端。
3) 保持标题、卡片层级、间距比例与参考图一致。

约束：
- 只能改给定附件中的关键文件。
- 必须输出完整代码，不接受只给思路。
- 最终输出需包含验收清单（至少 8 条）。
$$,
  3,
  array['exam-ui-replica','frontend','image','from-zero'],
  'code_case_multi',
  array['coach','exam'],
  'coding',
  'from_zero',
  1800,
  2,
  now()
),
(
  'drill-ui-replica-analytics-panel',
  203,
  'Exam：复现数据分析面板（桌面+移动）',
  $$
任务：根据两张 mockup，复现 Analytics 页面。
要求 AI 直接输出代码，包含卡片区、双图表区、移动端纵向布局。
必须给出可验证的像素级检查点（字号、边距、区块间距、容器圆角）。
$$,
  4,
  array['exam-ui-replica','analytics-ui','image','from-zero'],
  'code_case_multi',
  array['coach','exam'],
  'coding',
  'from_zero',
  2100,
  2,
  now()
),
(
  'drill-ui-replica-checkout-flow',
  204,
  'Exam：复现结算页并补全移动端交互区块',
  $$
任务：根据图片复现 Checkout 页面，并确保移动端按钮区域始终可见。
你给 AI 的提示词必须强制其输出完整代码与手动验收清单。
附带干扰文件，不允许无关重构。
$$,
  4,
  array['exam-ui-replica','checkout','image','from-zero'],
  'build_sim_case',
  array['coach','exam'],
  'coding',
  'from_zero',
  2400,
  2,
  now()
),
(
  'drill-ui-replica-admin-detail',
  205,
  'Exam：复现后台用户详情页（双图约束）',
  $$
任务：根据 dashboard 图与 detail 图复现后台详情页。
要求：左侧信息栏 + 右侧上下分区；必须保留模块层级关系。
输出必须包含：改动文件列表、完整代码、验收步骤、风险点。
$$,
  4,
  array['exam-ui-replica','admin-ui','image','from-zero'],
  'code_case_multi',
  array['coach','exam'],
  'coding',
  'from_zero',
  2100,
  2,
  now()
),
(
  'drill-template-bugfix-noisy-auth',
  206,
  '样板题：有干扰文件的认证 bug 定位（教学看板）',
  $$
这是教学样板题（只读）。演示如何写提示词让 AI 先定位根因再修复，
并避免被干扰文件带偏。
本题不支持提交，不进入评分流程。
$$,
  1,
  array['template','teaching','debug','noisy-files'],
  'template_case',
  array['coach'],
  'coding',
  null,
  null,
  null,
  now()
),
(
  'drill-bugfix-auth-token-race',
  207,
  'Exam：定位并修复登录态随机失效（含干扰文件）',
  $$
现象：用户在高并发切页时会随机掉登录态。
你将收到核心文件、日志和干扰文件。请写给 AI 的提示词，要求其：
1) 先定位根因；
2) 再给出最小修复代码；
3) 提供回归验证步骤。
$$,
  4,
  array['exam-debug','auth','race-condition','noisy-files'],
  'code_case_multi',
  array['coach','exam'],
  'coding',
  'debug',
  1800,
  2,
  now()
),
(
  'drill-bugfix-pagination-cache-mismatch',
  208,
  'Exam：修复分页与缓存键不一致导致的数据错位',
  $$
现象：翻页后列表偶发显示上一页内容。
要求 AI 直接输出修复代码，且解释为何不会引入重复请求和缓存污染。
$$,
  4,
  array['exam-debug','pagination','cache','noisy-files'],
  'code_case_multi',
  array['coach','exam'],
  'coding',
  'debug',
  1800,
  2,
  now()
),
(
  'drill-bugfix-timezone-report-off-by-one',
  209,
  'Exam：修复日报统计跨时区 off-by-one',
  $$
现象：UTC+8 用户在零点附近查看日报，日期常常偏一天。
要求 AI 输出修复代码并给出边界时间测试样例。
$$,
  4,
  array['exam-debug','timezone','reporting','noisy-files'],
  'code_case_multi',
  array['coach','exam'],
  'coding',
  'debug',
  2100,
  2,
  now()
),
(
  'drill-bugfix-upload-retry-loop',
  210,
  'Exam：修复上传重试死循环并保留断点续传',
  $$
现象：上传失败后重试触发无限循环，请求风暴导致服务降级。
要求 AI 给出最小改动方案，必须保留既有断点续传能力。
$$,
  5,
  array['exam-debug','upload','retry-loop','build-sim'],
  'build_sim_case',
  array['coach','exam'],
  'coding',
  'debug',
  2400,
  1,
  now()
),
(
  'drill-template-feature-extension-filter',
  211,
  '样板题：在旧页面上加高级筛选（教学看板）',
  $$
这是教学样板题（只读）。演示如何在“已有代码”基础上，
要求 AI 增量加功能并保留原行为。
本题不支持提交，不进入评分流程。
$$,
  1,
  array['template','teaching','feature','incremental-change'],
  'template_case',
  array['coach'],
  'coding',
  null,
  null,
  null,
  now()
),
(
  'drill-feature-add-advanced-filters',
  212,
  'Exam：在订单列表新增高级筛选并保持兼容',
  $$
基于已有订单列表页面，新增“状态+金额区间+时间区间”高级筛选。
约束：保留当前分页与排序行为，不允许重写整个列表。
要求 AI 输出完整增量代码与回归清单。
$$,
  4,
  array['exam-feature','filters','incremental-change'],
  'code_case_multi',
  array['coach','exam'],
  'coding',
  'feature',
  1800,
  2,
  now()
),
(
  'drill-feature-add-export-csv-job',
  213,
  'Exam：新增异步导出 CSV 任务',
  $$
在现有报表模块新增“异步导出 CSV”能力：
- 创建导出任务；
- 轮询任务状态；
- 完成后提供下载链接。
要求 AI 输出改动文件和关键回退策略。
$$,
  4,
  array['exam-feature','export','async-job'],
  'code_case_multi',
  array['coach','exam'],
  'coding',
  'feature',
  2100,
  2,
  now()
),
(
  'drill-feature-add-role-based-actions',
  214,
  'Exam：新增角色权限按钮并接入现有策略',
  $$
目标：在用户管理页新增角色权限动作按钮（禁用/启用/提升权限）。
约束：复用现有权限策略，不允许写新鉴权体系。
要求 AI 直接输出可运行代码与权限回归检查项。
$$,
  4,
  array['exam-feature','rbac','incremental-change'],
  'code_case_multi',
  array['coach','exam'],
  'coding',
  'feature',
  1800,
  2,
  now()
),
(
  'drill-feature-add-audit-timeline',
  215,
  'Exam：新增操作审计时间线视图',
  $$
目标：在工单详情页新增审计时间线，展示关键操作与操作者。
要求：保留现有详情页结构，增量实现，不破坏已有 API 契约。
输出必须包含完整代码和风险提示。
$$,
  5,
  array['exam-feature','audit','timeline','build-sim'],
  'build_sim_case',
  array['coach','exam'],
  'coding',
  'feature',
  2400,
  1,
  now()
),
(
  'drill-template-greenfield-mini-saas',
  216,
  '样板题：从 0 构建 mini SaaS（教学看板）',
  $$
这是教学样板题（只读）。演示如何把“从零构建项目”的需求拆成可执行轮次。
本题不支持提交，不进入评分流程。
$$,
  1,
  array['template','teaching','greenfield','from-zero'],
  'template_case',
  array['coach'],
  'coding',
  null,
  null,
  null,
  now()
),
(
  'drill-greenfield-mini-kanban-saas',
  217,
  'Exam：从 0 构建多用户看板 mini SaaS',
  $$
从 0 构建一个最小可运行看板系统：登录、项目列表、任务卡片流转。
要求 AI 输出项目结构、核心代码、验收步骤与风险。
$$,
  5,
  array['exam-from-zero','greenfield','kanban-saas'],
  'build_sim_case',
  array['coach','exam'],
  'coding',
  'from_zero',
  3000,
  1,
  now()
),
(
  'drill-greenfield-bug-report-portal',
  218,
  'Exam：从 0 构建缺陷提报门户',
  $$
从 0 构建 bug report portal：提报、筛选、状态流转、评论记录。
必须给出可运行代码，不接受伪代码。
$$,
  5,
  array['exam-from-zero','greenfield','bug-portal'],
  'build_sim_case',
  array['coach','exam'],
  'coding',
  'from_zero',
  3000,
  1,
  now()
),
(
  'drill-greenfield-event-checkin-app',
  219,
  'Exam：从 0 构建活动签到系统',
  $$
从 0 构建 check-in app：报名列表、签到、撤销签到、签到统计面板。
要求 AI 输出完整代码、文件清单和回归策略。
$$,
  5,
  array['exam-from-zero','greenfield','checkin'],
  'build_sim_case',
  array['coach','exam'],
  'coding',
  'from_zero',
  3000,
  1,
  now()
),
(
  'drill-greenfield-inventory-tracker',
  220,
  'Exam：从 0 构建库存追踪小项目',
  $$
从 0 构建 inventory tracker：入库、出库、低库存提醒、操作日志。
要求 AI 提供可运行代码和验收清单（至少 10 条）。
$$,
  5,
  array['exam-from-zero','greenfield','inventory'],
  'build_sim_case',
  array['coach','exam'],
  'coding',
  'from_zero',
  3000,
  1,
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
-- 2) drill_assets upsert
-- ============================================================================
insert into public.drill_assets (drill_id, asset_kind, path, content_text, order_no)
values
-- Template image assets
('drill-template-ui-replica-kanban', 'image', 'mockup-main', '/drill-images/ui-kanban-desktop.svg', 1),
('drill-template-bugfix-noisy-auth', 'log', 'auth-race.log', 'WARN token refresh overlapped in tab-switch', 1),
('drill-template-feature-extension-filter', 'spec', 'filter-spec.md', 'Need status amount date filters and keep existing pagination behavior.', 1),
('drill-template-greenfield-mini-saas', 'spec', 'mvp-spec.md', 'Need login projects tasks and simple activity log for MVP.', 1),

-- UI replica drills
('drill-ui-replica-kanban-basic', 'image', 'desktop', '/drill-images/ui-kanban-desktop.svg', 1),
('drill-ui-replica-kanban-basic', 'image', 'mobile', '/drill-images/ui-kanban-mobile.svg', 2),
('drill-ui-replica-kanban-basic', 'spec', 'acceptance.md', 'Match three columns desktop and stacked cards mobile. Keep title hierarchy and spacing.', 3),
('drill-ui-replica-kanban-basic', 'file', 'src/pages/board.tsx', 'export default function BoardPage(){return null;}', 4),
('drill-ui-replica-kanban-basic', 'file', 'src/components/UnusedCalendar.tsx', 'export function UnusedCalendar(){return null;}', 5),

('drill-ui-replica-analytics-panel', 'image', 'desktop', '/drill-images/ui-analytics-desktop.svg', 1),
('drill-ui-replica-analytics-panel', 'image', 'mobile', '/drill-images/ui-analytics-mobile.svg', 2),
('drill-ui-replica-analytics-panel', 'spec', 'acceptance.md', 'Top metric cards and two chart regions must match block hierarchy on both breakpoints.', 3),
('drill-ui-replica-analytics-panel', 'file', 'src/pages/analytics.tsx', 'export default function AnalyticsPage(){return null;}', 4),
('drill-ui-replica-analytics-panel', 'file', 'src/components/LegacyBanner.tsx', 'export function LegacyBanner(){return null;}', 5),

('drill-ui-replica-checkout-flow', 'image', 'desktop', '/drill-images/ui-checkout-desktop.svg', 1),
('drill-ui-replica-checkout-flow', 'image', 'mobile', '/drill-images/ui-checkout-mobile.svg', 2),
('drill-ui-replica-checkout-flow', 'spec', 'acceptance.md', 'Submit button must remain visible on mobile and order summary must stay in a separate section.', 3),
('drill-ui-replica-checkout-flow', 'file', 'src/pages/checkout.tsx', 'export default function CheckoutPage(){return null;}', 4),
('drill-ui-replica-checkout-flow', 'file', 'src/components/LegacyCoupon.tsx', 'export function LegacyCoupon(){return null;}', 5),

('drill-ui-replica-admin-detail', 'image', 'dashboard', '/drill-images/ui-admin-dashboard.svg', 1),
('drill-ui-replica-admin-detail', 'image', 'detail', '/drill-images/ui-admin-detail.svg', 2),
('drill-ui-replica-admin-detail', 'spec', 'acceptance.md', 'Need left profile column and right two-zone detail with consistent spacing.', 3),
('drill-ui-replica-admin-detail', 'file', 'src/pages/admin/user-detail.tsx', 'export default function UserDetail(){return null;}', 4),
('drill-ui-replica-admin-detail', 'file', 'src/components/OldHeatmap.tsx', 'export function OldHeatmap(){return null;}', 5),

-- Bugfix drills
('drill-bugfix-auth-token-race', 'file', 'src/auth/session.ts', 'export async function refreshToken(){/* TODO */}', 1),
('drill-bugfix-auth-token-race', 'file', 'src/middleware/authGuard.ts', 'export function authGuard(){/* TODO */}', 2),
('drill-bugfix-auth-token-race', 'log', 'logs/auth-race.log', 'ERROR refresh token called twice within 18ms', 3),
('drill-bugfix-auth-token-race', 'file', 'src/ui/theme.ts', 'export const THEME = { color: "blue" };', 4),
('drill-bugfix-auth-token-race', 'spec', 'constraints.md', 'Do not change auth API contract. Keep silent refresh behavior.', 5),

('drill-bugfix-pagination-cache-mismatch', 'file', 'src/hooks/useOrdersQuery.ts', 'export function useOrdersQuery(){/* TODO */}', 1),
('drill-bugfix-pagination-cache-mismatch', 'file', 'src/lib/cacheKey.ts', 'export function makeKey(page:number){return "orders:"+page;}', 2),
('drill-bugfix-pagination-cache-mismatch', 'log', 'logs/pagination-cache.log', 'WARN page=3 response rendered with key orders:2', 3),
('drill-bugfix-pagination-cache-mismatch', 'file', 'src/ui/IconPack.tsx', 'export function IconPack(){return null;}', 4),
('drill-bugfix-pagination-cache-mismatch', 'spec', 'constraints.md', 'Preserve pagination UI and existing API params.', 5),

('drill-bugfix-timezone-report-off-by-one', 'file', 'src/report/dateRange.ts', 'export function toReportDate(d:Date){return d.toISOString().slice(0,10);}', 1),
('drill-bugfix-timezone-report-off-by-one', 'file', 'src/report/service.ts', 'export async function fetchDailyReport(){/* TODO */}', 2),
('drill-bugfix-timezone-report-off-by-one', 'log', 'logs/report-timezone.log', 'INFO local=2026-03-02T00:05+08 mapped=2026-03-01', 3),
('drill-bugfix-timezone-report-off-by-one', 'file', 'src/ui/charts/theme.ts', 'export const chartTheme = {};', 4),
('drill-bugfix-timezone-report-off-by-one', 'spec', 'constraints.md', 'Keep UTC storage unchanged. Fix query date mapping only.', 5),

('drill-bugfix-upload-retry-loop', 'file', 'src/upload/retry.ts', 'export async function retryUpload(){/* TODO */}', 1),
('drill-bugfix-upload-retry-loop', 'file', 'src/upload/queue.ts', 'export function enqueue(){/* TODO */}', 2),
('drill-bugfix-upload-retry-loop', 'log', 'logs/upload-loop.log', 'ERROR retry count exceeded but loop continues', 3),
('drill-bugfix-upload-retry-loop', 'file', 'src/ui/uploadTips.tsx', 'export function UploadTips(){return null;}', 4),
('drill-bugfix-upload-retry-loop', 'spec', 'constraints.md', 'Must keep resume behavior and checksum process.', 5),

-- Feature extension drills
('drill-feature-add-advanced-filters', 'file', 'src/pages/orders.tsx', 'export default function OrdersPage(){return null;}', 1),
('drill-feature-add-advanced-filters', 'file', 'src/hooks/useOrderFilters.ts', 'export function useOrderFilters(){return {};}', 2),
('drill-feature-add-advanced-filters', 'spec', 'feature-spec.md', 'Add status amount date filters. Keep existing pagination and sort behavior.', 3),
('drill-feature-add-advanced-filters', 'file', 'src/components/ArchivedWidget.tsx', 'export function ArchivedWidget(){return null;}', 4),

('drill-feature-add-export-csv-job', 'file', 'src/report/export.ts', 'export async function createExportJob(){/* TODO */}', 1),
('drill-feature-add-export-csv-job', 'file', 'src/pages/reports.tsx', 'export default function ReportsPage(){return null;}', 2),
('drill-feature-add-export-csv-job', 'spec', 'feature-spec.md', 'Need create job poll status and download link states.', 3),
('drill-feature-add-export-csv-job', 'log', 'logs/export-job.log', 'INFO job queued but status polling not wired', 4),

('drill-feature-add-role-based-actions', 'file', 'src/pages/users.tsx', 'export default function UsersPage(){return null;}', 1),
('drill-feature-add-role-based-actions', 'file', 'src/lib/rbac.ts', 'export function can(action:string){return false;}', 2),
('drill-feature-add-role-based-actions', 'spec', 'feature-spec.md', 'Add enable disable promote actions with role checks and disabled states.', 3),
('drill-feature-add-role-based-actions', 'file', 'src/components/UnusedBadge.tsx', 'export function UnusedBadge(){return null;}', 4),

('drill-feature-add-audit-timeline', 'file', 'src/pages/ticket-detail.tsx', 'export default function TicketDetail(){return null;}', 1),
('drill-feature-add-audit-timeline', 'file', 'src/components/AuditTimeline.tsx', 'export function AuditTimeline(){return null;}', 2),
('drill-feature-add-audit-timeline', 'spec', 'feature-spec.md', 'Render sorted audit events with actor action and time, with empty state.', 3),
('drill-feature-add-audit-timeline', 'log', 'logs/audit-events.log', 'INFO events loaded but timeline not visible', 4),

-- Greenfield drills
('drill-greenfield-mini-kanban-saas', 'spec', 'project-spec.md', 'Need auth projects board and basic activity log in one small project.', 1),
('drill-greenfield-mini-kanban-saas', 'file', 'README.stub.md', 'Project bootstrap placeholder.', 2),
('drill-greenfield-mini-kanban-saas', 'image', 'ui-reference', '/drill-images/ui-kanban-desktop.svg', 3),

('drill-greenfield-bug-report-portal', 'spec', 'project-spec.md', 'Need submit bug list filter status transition and comment history.', 1),
('drill-greenfield-bug-report-portal', 'file', 'README.stub.md', 'Project bootstrap placeholder.', 2),
('drill-greenfield-bug-report-portal', 'image', 'ui-reference', '/drill-images/ui-admin-dashboard.svg', 3),

('drill-greenfield-event-checkin-app', 'spec', 'project-spec.md', 'Need attendee list checkin undo checkin and summary panel.', 1),
('drill-greenfield-event-checkin-app', 'file', 'README.stub.md', 'Project bootstrap placeholder.', 2),
('drill-greenfield-event-checkin-app', 'image', 'ui-reference', '/drill-images/ui-admin-detail.svg', 3),

('drill-greenfield-inventory-tracker', 'spec', 'project-spec.md', 'Need stock in stock out low-stock alerts and operation log.', 1),
('drill-greenfield-inventory-tracker', 'file', 'README.stub.md', 'Project bootstrap placeholder.', 2),
('drill-greenfield-inventory-tracker', 'image', 'ui-reference', '/drill-images/ui-analytics-desktop.svg', 3)
on conflict (drill_id, asset_kind, path) do update set
  content_text = excluded.content_text,
  order_no = excluded.order_no,
  updated_at = now();

-- ============================================================================
-- 3) drill_template_rounds upsert (4 template drills * 3 rounds)
-- ============================================================================
insert into public.drill_template_rounds (
  drill_id,
  round_no,
  version_label,
  prompt_text,
  teaching_notes_md
)
values
-- template: ui replica
('drill-template-ui-replica-kanban', 1, '第1版（模糊描述）', $$帮我照着图做个看板页面，尽量做得像。$$, $$问题：目标模糊，没有指出断点行为、输出格式和验收标准。$$),
('drill-template-ui-replica-kanban', 2, '第2版（有改进）', $$请根据两张图做页面，桌面三列、移动端单列，并给完整代码。$$, $$进步：有布局要求。缺口：间距层级、按钮状态、验收项仍不完整。$$),
('drill-template-ui-replica-kanban', 3, '第3版（标准版）', $$你是前端实现助手。请严格根据附件 desktop/mobile 图片复现页面。输出顺序：1运行方式 2文件结构 3完整代码 4验收清单(>=10条) 5风险点。必须覆盖桌面与移动断点，不允许省略代码。$$, $$标准版要点：明确断点、输出顺序、验收口径和禁止项。$$),

-- template: bugfix
('drill-template-bugfix-noisy-auth', 1, '第1版（直接让修）', $$登录有问题，你帮我修一下。$$, $$问题：没有现象、线索、约束，AI 只能猜。$$),
('drill-template-bugfix-noisy-auth', 2, '第2版（补现象）', $$高并发切页会掉登录态，帮我定位并修复。$$, $$进步：有现象。缺口：未说明干扰文件、输出格式和回归验证要求。$$),
('drill-template-bugfix-noisy-auth', 3, '第3版（标准版）', $$请先定位根因再修复。输入包含核心文件+日志+干扰文件。输出顺序：A 根因判断与证据 B 最小代码改动 C 回归测试清单 D 风险与回滚策略。不得重写认证架构。$$, $$标准版要点：先定位再改、证据驱动、边界清晰。$$),

-- template: feature
('drill-template-feature-extension-filter', 1, '第1版（只提需求）', $$在订单页加高级筛选。$$, $$问题：没有保兼容约束、没有输出标准。$$),
('drill-template-feature-extension-filter', 2, '第2版（补部分约束）', $$在现有订单页加状态和日期筛选，不要影响原分页。$$, $$进步：有兼容约束。缺口：缺少代码输出格式和验收项。$$),
('drill-template-feature-extension-filter', 3, '第3版（标准版）', $$基于现有附件做增量改造，不得重写列表页。新增状态+金额+日期筛选。输出：1改动文件列表 2完整代码 3回归清单(>=8条) 4风险说明。$$, $$标准版要点：增量改造、保行为、可验收。$$),

-- template: greenfield
('drill-template-greenfield-mini-saas', 1, '第1版（范围过大）', $$做一个完整 SaaS 系统。$$, $$问题：范围无限，没有 MVP 边界。$$),
('drill-template-greenfield-mini-saas', 2, '第2版（有 MVP）', $$做一个含登录和任务看板的小系统，给代码。$$, $$进步：有 MVP。缺口：缺少目录结构、验收和风险要求。$$),
('drill-template-greenfield-mini-saas', 3, '第3版（标准版）', $$从 0 构建 mini SaaS（登录+项目+任务流转+活动日志）。输出顺序：A 项目结构 B 核心代码 C 启动步骤 D 验收清单(>=10条) E 风险与下一步。必须直接给代码。$$, $$标准版要点：先定义边界，再强约束交付格式。$$)
on conflict (drill_id, round_no) do update set
  version_label = excluded.version_label,
  prompt_text = excluded.prompt_text,
  teaching_notes_md = excluded.teaching_notes_md,
  updated_at = now();

-- ============================================================================
-- 4) drill_schedule upsert (UTC 2026-03-03)
-- ============================================================================
insert into public.drill_schedule (date, slot, drill_id)
values
('2026-03-03', 1, 'drill-template-ui-replica-kanban'),
('2026-03-03', 2, 'drill-ui-replica-kanban-basic'),
('2026-03-03', 3, 'drill-bugfix-auth-token-race')
on conflict (date, slot) do update set
  drill_id = excluded.drill_id;
