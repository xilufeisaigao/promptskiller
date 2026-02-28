# [PromptSkiller] 文档目录

这里存放 PromptSkiller 的产品与工程相关文档。

为方便在文件夹内自然排序，文件名统一使用 `PS_XX_` 的编号前缀。

## 建议阅读顺序

1. [PS_01_PRD.md](./PS_01_PRD.md)：产品需求（目标、MVP 范围、用户流程、待定问题）
2. [PS_02_ARCHITECTURE.md](./PS_02_ARCHITECTURE.md)：Web MVP 架构概览
3. [PS_03_DATA_MODEL.md](./PS_03_DATA_MODEL.md)：Supabase（Postgres）数据模型草案
4. [PS_04_COMPETITIONS.md](./PS_04_COMPETITIONS.md)：周赛机制（规则、投票、公平性）
5. [PS_05_ROADMAP.md](./PS_05_ROADMAP.md)：里程碑与分阶段交付计划
6. [PS_06_EXECUTION_PLAN.md](./PS_06_EXECUTION_PLAN.md)：代码执行方案（实现步骤、测试方案、工具清单）
7. [PS_07_MVP_CHECKLIST.md](./PS_07_MVP_CHECKLIST.md)：MVP 验收清单（本地启动 + 数据库检查 + 核心流程）

## 写作原则

- 文档务实：优先描述未来 1-2 次迭代内会交付的内容。
- 需求不确定时，明确写在「待定问题 / Open Questions」里，而不是用模糊措辞带过。
- 任何新增的数据表/字段，都要同步更新到 [PS_03_DATA_MODEL.md](./PS_03_DATA_MODEL.md)。
