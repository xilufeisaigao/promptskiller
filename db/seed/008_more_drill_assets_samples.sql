-- [PromptSkiller] Seed extra drill assets (idempotent)

insert into public.drill_assets (drill_id, asset_kind, path, content_text, order_no)
values
(
  'drill-codecase-trace-gap-observability',
  'file',
  'gateway/middleware/trace.ts',
  $$
export function traceMiddleware(req, _res, next) {
  const traceId = req.headers["x-trace-id"] || crypto.randomUUID();
  req.ctx = { ...req.ctx, traceId };
  // BUG: downstream header is not always injected for retry branch
  if (!req.headers["x-retry"]) {
    req.headers["x-trace-id"] = traceId;
  }
  next();
}
$$,
  10
),
(
  'drill-codecase-trace-gap-observability',
  'file',
  'services/order/handler.ts',
  $$
export async function getOrder(req, res) {
  const traceId = req.headers["x-trace-id"];
  logger.info({ traceId, orderId: req.params.id }, "getOrder start");
  const order = await repo.findOrder(req.params.id);
  res.json(order);
}
$$,
  20
),
(
  'drill-codecase-trace-gap-observability',
  'file',
  'services/order/repo.ts',
  $$
export async function findOrder(id: string) {
  // traceId lost here; slow query log cannot be correlated
  return db.query("select * from orders where id = $1", [id]);
}
$$,
  30
),
(
  'drill-codecase-trace-gap-observability',
  'log',
  'logs/trace-missing.log',
  $$
2026-02-27T09:31:02Z gateway trace_id=8a12... path=/orders/1001
2026-02-27T09:31:02Z order-service trace_id=null order_id=1001
2026-02-27T09:31:03Z slow-query order_id=1001 duration_ms=814 trace_id=missing
$$,
  40
),
(
  'drill-build-sim-permission-center-v1',
  'file',
  'apps/admin/src/modules/permissions/page.tsx',
  $$
export default function PermissionCenterPage() {
  return <div>TODO: permission center</div>;
}
$$,
  10
),
(
  'drill-build-sim-permission-center-v1',
  'spec',
  'docs/permission-center-acceptance.md',
  $$
DoD:
1) 角色列表可按关键词过滤
2) 角色变更会记录审计日志字段
3) 核心权限变更支持回滚策略说明
4) 首屏加载时间 < 2s（模拟数据）
$$,
  20
)
on conflict (drill_id, asset_kind, path) do update set
  content_text = excluded.content_text,
  order_no = excluded.order_no,
  updated_at = now();
