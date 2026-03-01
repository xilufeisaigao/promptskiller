# [PromptSkiller] 项目快照（增量版，2026-02-28）

说明：该文档是对 [PS_08_PROJECT_SNAPSHOT.md](./PS_08_PROJECT_SNAPSHOT.md) 的新增快照，原文档保留不删。

## 快照信息

- 快照日期：2026-02-28（Asia/Shanghai）
- 快照来源：本地仓库 + 实时数据库查询
- 数据库连接时间：2026-02-28 08:18:50 UTC

## 版本增量（相对 PS_08）

### 1) 管理后台能力已落地

- 新增路由：`/admin`
- 账号区分：普通账号 / 管理员账号（基于 `profiles.is_admin`）
- 管理员可在后台：
- 发布每日题目（按 UTC 日期 + slot）
- 直接新增题库题目（title/body/tags/difficulty/published_at）
- 查看单题用户提交记录与得分统计（样本、均分、最高/最低、最近提交）

### 2) 今日训练题源升级

- `/drills/today` 优先读取 `public.drill_schedule` 的管理员排期题单。
- 若排期不足 3 题，自动回退并补齐确定性推荐题，保证页面始终可用。

### 3) 数据权限升级（RLS）

- 新增管理员辅助函数：`public.is_admin()`
- `drills` 新增管理员写策略（insert/update/delete）
- `drill_schedule` 新增管理员写策略（insert/update/delete）
- `drill_attempts` 新增管理员全量读取策略（用于后台统计）

## 数据库迁移状态（最新）

- `001_init.sql`
- `002_weekly_challenges.sql`
- `003_drills_display_no.sql`
- `004_admin_rbac_and_schedule_slots.sql`（新增）

## 数据库实时快照（本次采集）

- `public.drills = 5`
- `public.drill_schedule = 0`
- `public.drill_attempts = 0`
- `public.profiles = 1`
- `auth.users = 1`
- `admin_profiles = 1`

## 管理员账号开通记录

详见：[PS_10_ADMIN_ACCOUNT_BOOTSTRAP.md](./PS_10_ADMIN_ACCOUNT_BOOTSTRAP.md)

## 质量验证

本次增量功能已执行以下检查：

- `npm run lint`：通过
- `npm run typecheck`：通过
- `npm test`：通过
- `npm run db:migrate`：通过（包含 004 迁移）

## 当前已知缺口（更新后）

- 管理后台当前仅支持“新增题目 + 发布题单 + 查看统计”，尚未提供“编辑题目 / 下线题目”。
- 后台提交统计目前以列表 + 基础聚合为主，尚未提供时间范围和维度筛选。
- 仍缺部署文档与发布 checklist（建议补充 `PS_12_DEPLOYMENT.md`）。
