-- [PromptSkiller] Seed drill assets (idempotent)

insert into public.drill_assets (drill_id, asset_kind, path, content_text, order_no)
values
-- drill-codecase-multi-file-debug-auth-refresh
(
  'drill-codecase-multi-file-debug-auth-refresh',
  'file',
  'src/auth/client.ts',
  $$
export async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (res.status === 401) {
    await refreshToken();
    return fetchWithAuth(input, init); // potential loop
  }

  return res;
}
$$,
  10
),
(
  'drill-codecase-multi-file-debug-auth-refresh',
  'file',
  'src/auth/refresh.ts',
  $$
let refreshing: Promise<void> | null = null;

export async function refreshToken() {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        localStorage.setItem('access_token', data.access_token);
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}
$$,
  20
),
(
  'drill-codecase-multi-file-debug-auth-refresh',
  'log',
  'logs/auth-refresh.log',
  $$
2026-02-20T03:15:11Z request_id=52a status=401 path=/api/profile
2026-02-20T03:15:11Z request_id=52a action=refresh start
2026-02-20T03:15:11Z request_id=52a action=refresh done access_exp=2026-02-20T03:45:11Z
2026-02-20T03:15:11Z request_id=52a status=401 path=/api/profile retry=1
2026-02-20T03:15:11Z request_id=52a status=401 path=/api/profile retry=2
...
$$,
  30
),
(
  'drill-codecase-multi-file-debug-auth-refresh',
  'spec',
  'docs/constraints.md',
  $$
- access token 过期后必须触发 refresh
- refresh 接口最多 1 秒内可重试一次
- 不能影响未登录页面访问
- 不允许修改 auth 数据库表结构
$$,
  40
),

-- drill-codecase-workflow-refactor-order-pipeline
(
  'drill-codecase-workflow-refactor-order-pipeline',
  'file',
  'src/order/pipeline.ts',
  $$
export async function runPipeline(ctx: OrderContext) {
  await validateStep(ctx);
  await reserveStockStep(ctx);
  await payStep(ctx);
  await notifyStep(ctx);
}

export async function notifyStep(ctx: OrderContext) {
  try {
    await pushWebhook(ctx);
  } catch (e) {
    logger.warn({ orderId: ctx.orderId, e }, "notify failed");
  }
}
$$,
  10
),
(
  'drill-codecase-workflow-refactor-order-pipeline',
  'log',
  'logs/order-failures.log',
  $$
[warn] order=O-1003 reserve timeout, retry=3
[error] order=O-1003 pay duplicated callback txn=T-9a8
[warn] order=O-1004 notify webhook failed (500)
$$,
  20
),
(
  'drill-codecase-workflow-refactor-order-pipeline',
  'spec',
  'docs/release-constraints.md',
  $$
- 流水线步骤必须保持执行顺序
- API 响应字段不允许变化
- 首次发布仅允许 10% 流量灰度
- 每步都需提供回滚策略
$$,
  30
),

-- drill-build-sim-alert-center-v1
(
  'drill-build-sim-alert-center-v1',
  'file',
  'apps/web/src/modules/alerts/page.tsx',
  $$
export default function AlertsPage() {
  return <div>TODO: alert center</div>;
}
$$,
  10
),
(
  'drill-build-sim-alert-center-v1',
  'file',
  'packages/shared/src/alerts/types.ts',
  $$
export type AlertLevel = 'info' | 'warn' | 'critical';

export type AlertItem = {
  id: string;
  title: string;
  level: AlertLevel;
  createdAt: string;
  read: boolean;
};
$$,
  20
),
(
  'drill-build-sim-alert-center-v1',
  'spec',
  'docs/acceptance.md',
  $$
DoD:
1) 页面可按 level 过滤
2) 支持已读/未读切换
3) 列表首屏加载时间 < 1.5s（模拟数据）
4) 关键操作有可观察日志字段
$$,
  30
)
on conflict (drill_id, asset_kind, path) do update set
  content_text = excluded.content_text,
  order_no = excluded.order_no,
  updated_at = now();
