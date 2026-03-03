# [PromptSkiller] 文档目录

这里存放 PromptSkiller 的产品与工程文档。  
文件名统一使用 `PS_XX_` 编号前缀，方便自然排序与状态追踪。

## 建议阅读顺序（当前基线）

1. [PS_01_PRD.md](./PS_01_PRD.md)：产品目标、MVP 范围、当前冻结需求
2. [PS_02_ARCHITECTURE.md](./PS_02_ARCHITECTURE.md)：Web 架构与关键数据流
3. [PS_03_DATA_MODEL.md](./PS_03_DATA_MODEL.md)：Supabase/Postgres 数据模型与迁移
4. [PS_04_COMPETITIONS.md](./PS_04_COMPETITIONS.md)：周赛机制与当前规则
5. [PS_05_ROADMAP.md](./PS_05_ROADMAP.md)：里程碑状态与后续迭代计划
6. [PS_07_MVP_CHECKLIST.md](./PS_07_MVP_CHECKLIST.md)：MVP 验收清单（启动、联通性、核心流程）
7. [PS_09_NEXT_DESIGN_FLOW.md](./PS_09_NEXT_DESIGN_FLOW.md)：Post-MVP 设计流程（标签/模块/复杂代码题）
8. [PS_14_DAILY_CONTENT_OPS.md](./PS_14_DAILY_CONTENT_OPS.md)：每日发题规范（四题型建题 + SQL 命名 + 上架流程）
9. [PS_16_MODULE_CLASSIFICATION_V2.md](./PS_16_MODULE_CLASSIFICATION_V2.md)：题库分类页 V2 设计与落地（按题型/标签专题 + 模块分层）
10. [PS_17_PROJECT_SNAPSHOT_2026-03-01.md](./PS_17_PROJECT_SNAPSHOT_2026-03-01.md)：项目快照增量（题库分面筛选 + 模块化分类导航 V2）
11. [PS_18_MODE_SPLIT_COACH_EXAM_DESIGN.md](./PS_18_MODE_SPLIT_COACH_EXAM_DESIGN.md)：模式重构设计（教练模式 / 考试模式）
12. [PS_19_MODE_SPLIT_EXECUTION_STATUS_2026-03-03.md](./PS_19_MODE_SPLIT_EXECUTION_STATUS_2026-03-03.md)：本轮执行状态同步（任务拆解 + 落地进度）

## 归档文档（历史保留）

以下文档已移至 `docs/archive/`，避免主目录过载，但可随时回溯：

- `PS_08_PROJECT_SNAPSHOT.md`
- `PS_10_ADMIN_ACCOUNT_BOOTSTRAP.md`
- `PS_11_PROJECT_SNAPSHOT_2026-02-28.md`
- `PS_12_PROJECT_SNAPSHOT_2026-02-28.md`
- `PS_13_PROJECT_SNAPSHOT_2026-02-28.md`
- `PS_15_PROJECT_SNAPSHOT_2026-03-01.md`

## 当前文档基线

- 主目录只保留“当前有效规范 + 最新状态同步”文档；历史阶段性快照统一归档。
- 数据库快照（2026-03-03）：`drills=42`、`drill_assets=88`、`drill_template_rounds=18`、`drill_modules=5`、`drill_module_items=21`、`drill_schedule=51`、`drill_attempts=6`、`weekly_challenges=1`。
- 模式重构当前使用：
  - 设计文档：`PS_18`
  - 执行文档：`PS_19`

## 写作原则

- 文档优先描述“已实现状态 + 下一步可执行计划”，避免过期规划。
- 需求未定时，显式标记为“待决策”，并写清影响范围。
- 任何新增数据表或字段，必须同步更新 [PS_03_DATA_MODEL.md](./PS_03_DATA_MODEL.md)。
