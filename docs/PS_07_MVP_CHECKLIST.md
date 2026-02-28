# [PromptSkiller] MVP 验收清单（本地启动 + 数据库检查 + 核心流程）

本文档用于你早上快速验收：MVP 是否“能跑通闭环”，以及数据库是否正常连通。

## 0. 先决条件

- 已安装 Node.js + npm
- 项目根目录存在 `.env.local`（已被 `.gitignore` 忽略，不要提交）
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_DB_URL`（仅给 `psql` 用，用于 `db:*` 脚本）
- （可选）你有自己的 OpenAI key：用于体验“真实 AI 教练”

## 1. 一键检查（建议先跑）

在项目根目录执行：

```bash
npm run db:status
npm run lint
npm run typecheck
npm test
npm run build
```

预期：

- `db:status` 能输出 `whoami/connected_at`，并列出 public 表；关键表行数能看到 drills=5、weekly_challenges=1
- `lint/typecheck/test/build` 均通过

备注：

- 如果 `db:status` 里出现 `public.notes`：这是你 Supabase 项目里可能已存在的示例表，PromptSkiller MVP 不依赖它。

## 2. 本地启动与手工验收

启动开发服务器：

```bash
npm run dev
```

打开 `http://localhost:3000` 后按以下顺序验收。

### 2.1 今日训练（Mock 教练，匿名模式）

路径：`/drills/today`

验证点：

- 能看到“今日训练题”内容
- 输入一段 prompt，点击“提交给教练”
- 能立即看到结构化反馈（分数 + 缺失项 + 改写建议等）
- 刷新页面后，匿名模式历史记录仍存在（LocalStorage）

### 2.2 配置真实 AI（可选）

路径：`/settings`

验证点：

- 不填任何内容，默认 Mock
- 填入 OpenAI key 后点击“测试并保存”
  - 如果连通：显示连接正常
  - 如果不连通：显示原因并不保存
- 回到 `/drills/today` 再次提交，应显示“真实模型”模式

安全提示：

- Key 仅保存在浏览器 LocalStorage，并在每次调用 `/api/coach` 时临时随请求携带。
- 如果你不希望浏览器保存 key，直接留空即可。

### 2.3 登录与云端存档（Supabase Auth）

路径：`/auth`

验证点：

- 能注册/登录（是否需要邮箱验证取决于 Supabase Auth 配置）
- 登录后回到 `/drills/today` 提交一次训练
- 再跑一次 `npm run db:status`，确认数据库连接仍正常

进一步（可选）：

- 用 Supabase Dashboard 或 `psql` 查询 `public.drill_attempts` 行数是否增加

### 2.4 周赛：提交与投票

路径：`/challenges` -> 进入本周挑战详情页

验证点：

- 能看到本周挑战内容
- 登录状态下可以提交（artifact_url + prompt_log）
- 能在列表看到自己的 submission，并能打开分享页 `/submissions/<id>`
- 投票按钮可用：不能给自己投票；投票后 `votes_count` 增加，再次点击可取消投票

## 3. 你可能会关心的边界与默认策略

- drills 内容来源：优先从 DB `public.drills` 读取；失败会 fallback 到本地常量，保证 UI 不空。
- “今日题目”选择：按 UTC 日期 + drills 列表确定性选择（MVP 未使用 `drill_schedule`）。
- 数据安全：所有写入表均开启 RLS，默认只允许 owner 写入/读取个人记录；公开内容（drills、weekly_challenges、submissions、votes）允许 public read。

