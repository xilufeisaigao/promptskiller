# [PromptSkiller] 文档目录

这里存放 PromptSkiller 的产品与工程文档。

为方便文件夹内自然排序，文件名统一使用 `PS_XX_` 编号前缀。

## 建议阅读顺序

1. [PS_01_PRD.md](./PS_01_PRD.md)：产品目标、MVP 范围、当前冻结需求
2. [PS_08_PROJECT_SNAPSHOT.md](./PS_08_PROJECT_SNAPSHOT.md)：项目快照（截至 2026-02-28 的真实实现状态）
3. [PS_02_ARCHITECTURE.md](./PS_02_ARCHITECTURE.md)：Web 架构与关键数据流
4. [PS_03_DATA_MODEL.md](./PS_03_DATA_MODEL.md)：Supabase/Postgres 数据模型与迁移
5. [PS_04_COMPETITIONS.md](./PS_04_COMPETITIONS.md)：周赛机制与当前规则
6. [PS_05_ROADMAP.md](./PS_05_ROADMAP.md)：里程碑状态与后续迭代计划
7. [PS_07_MVP_CHECKLIST.md](./PS_07_MVP_CHECKLIST.md)：MVP 验收清单（启动、联通性、核心流程）
8. [PS_09_NEXT_DESIGN_FLOW.md](./PS_09_NEXT_DESIGN_FLOW.md)：Post-MVP 设计流程（标签/模块/复杂代码题）
9. [PS_10_ADMIN_ACCOUNT_BOOTSTRAP.md](./PS_10_ADMIN_ACCOUNT_BOOTSTRAP.md)：管理员账号开通记录（SQL）
10. [PS_11_PROJECT_SNAPSHOT_2026-02-28.md](./PS_11_PROJECT_SNAPSHOT_2026-02-28.md)：项目快照增量（管理员后台上线后）
11. [PS_12_PROJECT_SNAPSHOT_2026-02-28.md](./PS_12_PROJECT_SNAPSHOT_2026-02-28.md)：项目快照增量（题型扩展 + 模块体系上线）
12. [PS_13_PROJECT_SNAPSHOT_2026-02-28.md](./PS_13_PROJECT_SNAPSHOT_2026-02-28.md)：项目快照增量（模块收口 + 云端进度 + 造数）
13. [PS_14_DAILY_CONTENT_OPS.md](./PS_14_DAILY_CONTENT_OPS.md)：每日发题规范（四题型建题 + SQL 命名 + 上架流程）
14. [PS_15_PROJECT_SNAPSHOT_2026-03-01.md](./PS_15_PROJECT_SNAPSHOT_2026-03-01.md)：项目快照增量（教学样板题 + 项目专属内容运营 skill）
15. [PS_16_MODULE_CLASSIFICATION_V2.md](./PS_16_MODULE_CLASSIFICATION_V2.md)：题库分类页 V2 设计与落地（按题型/标签专题 + 模块分层）
16. [PS_17_PROJECT_SNAPSHOT_2026-03-01.md](./PS_17_PROJECT_SNAPSHOT_2026-03-01.md)：项目快照增量（题库分面筛选 + 模块化分类导航 V2）

## 当前文档基线

- 本次已清理过时文档 `PS_06_EXECUTION_PLAN.md`（该文件属于开发前规划，已不再反映现状）。
- 文档内容统一同步到当前实现：题库页面、今日 3 题推荐、可调分栏练习区、周赛提交流程、投票与个人统计。
- 数据库快照来自 `npm run db:status`（2026-03-01）：`drills=15`、`drill_assets=16`、`drill_template_rounds=3`、`drill_schedule=45`、`drill_attempts=6`、`weekly_challenges=1`。
- 新增 `PS_09_NEXT_DESIGN_FLOW.md`，用于承接 MVP 后的产品设计与信息架构升级。
- 新增 `PS_10_ADMIN_ACCOUNT_BOOTSTRAP.md`，记录管理员账号 SQL 开通结果。
- 新增 `PS_11_PROJECT_SNAPSHOT_2026-02-28.md`，保留 `PS_08` 的同时追加最新快照。
- 新增 `PS_12_PROJECT_SNAPSHOT_2026-02-28.md`，记录 Sprint C/B（题型扩展 + 模块体系）完成状态。
- 新增 `PS_13_PROJECT_SNAPSHOT_2026-02-28.md`，记录本轮收口（云端进度、终局中途简版评分、扩展种子数据）完成状态。
- 新增 `PS_14_DAILY_CONTENT_OPS.md`，固化“每天发布样板题 + 练习题”操作标准，并配套项目内 skill。
- 新增项目内 skill：`.codex/skills/daily-drill-content-ops/SKILL.md`（内容运营标准流程）。
- 新增 `PS_15_PROJECT_SNAPSHOT_2026-03-01.md`，记录 `template_case` 看板题型与日更发布流程落地状态。
- 新增 `PS_16_MODULE_CLASSIFICATION_V2.md`，记录题库“分面筛选 + 专题导航 + 模块等级筛选”的 V2 升级方案与实现范围。
- 新增 `PS_17_PROJECT_SNAPSHOT_2026-03-01.md`，记录模块分类页 V2 的实际交付与测试结论。

## 写作原则

- 文档优先描述“已实现状态 + 下一步可执行计划”，避免过期规划。
- 需求未定时，显式标记为“待决策”，并写清影响范围。
- 任何新增数据表或字段，必须同步更新 [PS_03_DATA_MODEL.md](./PS_03_DATA_MODEL.md)。
