# [PromptSkiller] 架构（Web MVP）

## 技术栈

- Next.js（App Router）
- Tailwind CSS
- shadcn/ui（基于 Radix UI primitives）
- Supabase
  - Auth
  - Postgres 数据库
  - Storage（可选：存提交截图等）

## 运行时组件

- Next.js Web 应用（UI）
- Supabase Client
  - 浏览器端 client：在 RLS 约束下读写
  - 服务端使用（可选）：执行需要特权的操作
- AI 教练服务（服务端）
  - Next.js Route Handler：调用所选 LLM provider

## 建议路由（MVP）

- `/` 落地页
- `/auth` 登录/注册
- `/drills/today` 今日训练
- `/drills/[id]` 训练题详情
- `/challenges` 挑战列表（本周 + 历史）
- `/challenges/[id]` 挑战详情
- `/submissions/[id]` 作品公开分享页
- `/profile` 个人主页

## AI 教练接入

约束：

- 不要在浏览器暴露平台的 LLM API Key。
- 需要按 `user_id` / IP 做限流，控制成本。
- 只存必要信息：
  - prompt 文本
  - 教练反馈
  - 分数/结构化维度

推荐方案：

- `POST /api/coach`
  - 输入：`drill_id`, `prompt_text`, `attempt_index`
  - 输出：结构化反馈 JSON

## 安全与权限（Supabase RLS）

最低要求：

- 用户可公开读取训练题与挑战题（public read）
- 用户可创建/读取自己的训练尝试（attempts）
- 用户可创建挑战提交（submission），并在截止前可选地编辑
- 投票规则：
  - 每人每个 submission 只能投票一次（唯一约束 + RLS 规则配合）

## 内容运营（MVP）

MVP 先避免做后台管理 UI：

- 在 Supabase 里直接用 SQL 插入/seed drills & challenges
- 后续如果需要，可加一个最小化的内部 admin route（用 role / allow list 保护）

