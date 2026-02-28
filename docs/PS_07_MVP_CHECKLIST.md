# [PromptSkiller] MVP 验收清单（当前版本）

本文档用于快速验证当前产品闭环是否正常（截至 2026-02-28）。

## 0. 先决条件

- 已安装 Node.js + npm。
- 已安装 `psql`（用于 `db:*` 脚本）。
- 项目根目录存在 `.env.local`（不要提交到仓库）。
- `.env.local` 至少包含 `NEXT_PUBLIC_SUPABASE_URL`。
- `.env.local` 至少包含 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- `.env.local` 至少包含 `SUPABASE_DB_URL`。

## 1. 基础健康检查

在项目根目录执行：

```bash
npm run db:status
npm run lint
npm run typecheck
npm test
npm run build
```

预期结果：

- `db:status` 可连通数据库并输出表信息。
- 关键行数至少应看到 `drills=5`、`weekly_challenges=1`（种子已执行时）。
- `lint/typecheck/test/build` 全通过。

## 2. 本地启动

```bash
npm run dev
```

浏览器打开 `http://localhost:3000`。

## 3. 手工验收路径

### 3.1 首页与导航

- 首页能正常打开。
- 顶部导航可进入：`今日训练`、`题库`、`周赛`、`配置`。

### 3.2 题库页

路径：`/drills`

- 可看到题目列表与题号（`PS-xxx`）。
- 搜索支持题号、标题、slug、tag。
- 点击“开始训练”可进入对应题目。

### 3.3 今日训练（核心）

路径：`/drills/today`

- 页面显示当天推荐 3 题（UTC 日期文案可见）。
- 点击不同题卡可切换训练题。
- 练习区左右拖拽、右侧上下拖拽可生效。
- 刷新页面后分栏比例保持。

提交验证（匿名模式）：

- 不配置 key 时，显示 Mock 模式。
- 输入 prompt 并提交后，出现“生成中”打字反馈。
- 结果包含总分、5 个维度分数、缺失项、歧义点、补充问题。
- 参考答案默认不展开，点击按钮后才显示。
- 历史记录可回看并可清空。

### 3.4 配置真实模型（可选）

路径：`/settings`

- 默认状态应提示 Mock 模式。
- 服务商下拉包含 `OpenAI`、`阿里云百炼（兼容模式）`、`自定义（OpenAI 兼容）`。
- 填入 key 后点击“测试并保存”：成功时显示“连接正常”。
- 填入 key 后点击“测试并保存”：失败时显示错误，不应保存。
- 回到训练页再次提交，可看到真实模型模式标签。

### 3.5 登录与云端存档

路径：`/auth`

- 注册/登录可用（是否邮件验证由 Supabase 配置决定）。
- 登录后在训练页提交一次。
- 历史记录应写入云端（同账号刷新或跨设备可见）。

### 3.6 周赛提交与投票

路径：`/challenges` -> `/challenges/[slug]`

- 能看到当前周赛并进入详情页。
- 登录后可提交作品（`artifact_url` + `prompt_log`）。
- 提交后列表可见，且可打开 `/submissions/[id]` 分享页。
- 点赞按钮可切换状态。
- 对自己的作品点赞应被拦截。

### 3.7 个人页

路径：`/profile`

- 登录后能看到训练次数、平均分、连续天数。
- “我的周赛提交”列表可显示提交记录与获赞。

## 4. 边界与默认行为

- 训练题读取失败时自动回退本地题库，页面不空白。
- 未登录训练默认本地存储；登录后写入云端表 `drill_attempts`。
- 所有关键写入表均受 RLS 保护。
- `public.notes` 若出现在数据库中，属于 Supabase 历史示例表，不影响 PromptSkiller。
