# [PromptSkiller] 架构（Web MVP + Sprint C/B）

## 技术栈

- Next.js 16（App Router）
- React 19
- Tailwind CSS 4
- Supabase Auth（登录/注册与会话）
- Supabase Postgres（业务数据）
- Supabase RLS（行级权限控制）
- Zod（API 入参校验）
- Vitest（单元测试）

## 运行时组件

- Next.js 页面层（SSR + Client Components 混合）
- Supabase 浏览器端 Client（用户态读写）
- Next.js Route Handlers（服务端 API）
- AI 教练适配层（Mock + OpenAI 兼容服务）

## 当前路由

- `/`：首页（产品说明 + 快捷入口 + 模块入口）
- `/auth`：登录/注册
- `/admin`：管理后台（仅管理员可访问）
- `/settings`：模型配置与 key 连通性测试
- `/drills`：题库 + 模块双视图（支持 `?view=modules`、`?module=<slug>`）
- `/drills/today`：优先显示管理员发布题单，缺口再补齐推荐题
- `/drills/[id]`：训练题固定链接
- `/challenges`：周赛列表
- `/challenges/[slug]`：周赛详情、提交、投票
- `/submissions/[id]`：作品公开页
- `/profile`：个人统计页
- `/api/coach`：训练提交后获取教练反馈与（可选）模拟构建产物
- `/api/openai/test-key`：测试 API Key 联通性

## 训练链路（Drill Flow）

1. 页面读取题目：从 `public.drills` 拉取，包含 `drill_type`；数据库不可用时回退本地题库。
2. 今日题选择：先读 `public.drill_schedule`（UTC 日期 + slot），不足 3 题时用确定性推荐补齐。
3. 附件加载：按题目读取 `public.drill_assets`，前端以 `题面/文件/日志` Tab 展示。
4. 用户提交提示词：前端调用 `POST /api/coach`，请求体含 `drillId`、`promptText`、可选 provider 参数。
5. 教练反馈生成：
- 未配置 key：走 `mockCoachFeedback`
- 已配置 key：走 OpenAI 兼容调用
- `build_sim_case`：额外生成结构化 `round_output`
6. 会话与轮次持久化（登录用户）：
- `drill_sessions` 记录反馈模式与状态
- `drill_session_rounds` 记录每轮 prompt、评估、可见性、模拟工作区快照
7. 统计持久化：并行写入 `drill_attempts` 作为后台统计聚合层。
8. 展示：
- `guided` 模式：每轮即时显示评分
- `final_only` 模式：每轮入库但隐藏，完成会话后统一显示终局报告
- 可选中途简版评分：仅展示分数，不展示改进建议（由本地设置开关控制）

补充：

- `template_case` 不进入提交链路，页面只渲染固定轮次看板（`drill_template_rounds`）。

## 模块链路（Module Flow）

1. 读取 `drill_modules` 与 `drill_module_items`。
2. 在 `/drills` 模块视图展示模块卡片、题目序列与进度。
3. 用户可从模块切换到题库过滤（`?module=<slug>`）或直接打开题目训练。
4. 登录态优先读取 `drill_user_progress`（云端聚合）；未登录回退本地 `promptskiller.progress.drills.v1`。

## 管理后台链路（Admin Flow）

1. 管理员登录后进入 `/admin`。
2. 题库管理：新增/编辑/发布/下线题目（包含 `drill_type`）。
3. 附件管理：在同页维护 `drill_assets`（`file/log/spec` + path + content + order）。
4. 排期管理：写入 `public.drill_schedule`（`date + slot + drill_id`），支持批量排期。
5. 统计查看：读取 `public.drill_attempts` 聚合与明细（按题过滤）。

## UI 架构要点

- 训练页采用清晰双栏：左侧题面+附件+输入，右侧反馈模式+反馈+历史。
- 支持普通题与复杂题共存：无附件题不会增加多余操作成本。
- `build_sim_case` 新增“本轮模拟产物”卡片，展示变更文件与 patch 预览。
- `template_case` 使用只读看板布局：左侧题面/附件，右侧固定轮次示例与讲解要点。
- 题库页支持“题库视图/模块视图”切换，模块视图强调路径与进度。

## AI Provider 适配策略

- 标准输入：统一由前端传 `provider/baseUrl/model/apiKey`。
- Provider 预设：`openai` / `bailian` / `custom`。
- 联通性校验先于保存，失败不落库/不持久化。

## 数据与权限设计（RLS）

- 公共可读：`drills`、`drill_assets`、`drill_template_rounds`、`drill_schedule`、`drill_modules`、`drill_module_items`、周赛相关表。
- 用户私有：`drill_attempts`、`drill_sessions`、`drill_session_rounds`（仅 owner 可写）。
- 用户私有聚合读：`drill_user_progress`（owner 可读，触发器自动写入）。
- 管理员能力：`drills`、`drill_assets`、`drill_template_rounds`、`drill_schedule`、`drill_modules`、`drill_module_items` 写权限。
- 管理员可读：训练提交与会话轮次全量读取（运营统计）。

## 内容发布机制（当前）

- 训练题、附件、模块：仍以 SQL seed + 管理后台共同维护（不依赖完整 CMS）。
- 每日题单：后台写入 `drill_schedule`，按 UTC 生效。
- 周赛题：保持 seed 管理（后续可并入后台）。
