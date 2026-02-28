# [PromptSkiller] 架构（Web MVP）

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

- `/`：首页（产品说明 + 快捷入口）
- `/auth`：登录/注册
- `/settings`：模型配置与 key 连通性测试
- `/drills`：题库列表 + 搜索
- `/drills/today`：每日推荐 3 题
- `/drills/[id]`：训练题固定链接
- `/challenges`：周赛列表
- `/challenges/[slug]`：周赛详情、提交、投票
- `/submissions/[id]`：作品公开页
- `/profile`：个人统计页
- `/api/coach`：训练提交后获取教练反馈
- `/api/openai/test-key`：测试 API Key 联通性

## 训练链路（Drill Flow）

1. 页面读取题目：先从 `public.drills` 读取并按 `display_no` 排序；数据库不可用时回退到本地题库。
2. 用户提交提示词：前端调用 `POST /api/coach`，请求体包含 `drillId`、`promptText` 与可选 provider 参数。
3. 教练反馈生成：未配置 key 走 `mockCoachFeedback`；已配置 key 走 OpenAI 兼容调用（支持 OpenAI/百炼/custom）。
4. 持久化：未登录写 LocalStorage，已登录写 `public.drill_attempts`。
5. 展示：反馈区展示结构化评分建议，历史区支持版本切换与回看。

## UI 架构要点

- 训练页采用双层可调分栏。
- 主分栏：左（题面+输入）/右（反馈+历史）。
- 次分栏：右侧反馈区与历史区上下可拖拽。
- 分栏比例持久化到 LocalStorage，提升复访体验。
- 反馈组件对参考答案使用显式按钮展开，避免过早“抄答案”。

## AI Provider 适配策略

- 标准输入：统一由前端传 `provider/baseUrl/model/apiKey`。
- Provider 预设：`openai`。
- Provider 预设：`bailian`（`dashscope.aliyuncs.com/compatible-mode/v1`）。
- Provider 预设：`custom`（任意 OpenAI 兼容网关）。
- 联通性校验先于保存，失败不落库/不持久化。

## 数据与权限设计（RLS）

- 公共可读：`drills`、`weekly_challenges`、`challenge_submissions`、`submission_votes`
- 用户私有：`drill_attempts`（仅 owner 可读写）
- 周赛提交：仅登录用户可写，且须满足挑战时间窗口
- 投票：仅登录用户可写，且通过约束限制重复投票和自投

## 内容发布机制（当前）

- 通过 SQL migration + seed 管理内容。
- 训练题与周赛题由 `db/seed/*.sql` 维护。
- 尚未实现后台管理 UI（后续迭代项）。
