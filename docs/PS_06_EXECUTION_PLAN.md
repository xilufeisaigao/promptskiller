# [PromptSkiller] 代码执行方案（实现步骤 + 测试方案 + 工具清单）

本文档用于描述：如果我从现在开始自动编码，应该按什么顺序落地 Web MVP，以及我需要用到哪些工具/权限才能在今天把代码写完并跑完测试。

## 0. 当前仓库状态（我看到的）

- Next.js（App Router）项目已初始化。
- `shadcn/ui` 已配置，但还没生成任何 `components/ui/*` 组件文件。
- `@supabase/supabase-js` 已安装，但代码里还未接入 Supabase。
- 目前没有单测/E2E 测试框架（只存在 `eslint`）。

## 1. 依赖的产品决策（会影响实现方案）

你之前提到“这些问题你都回答了”，但我在仓库 `docs/` 里暂时没看到最终答案固化在文档里。
为了避免“实现到一半再返工”，建议把答案写在这里，作为实现时的单一事实来源（Single Source of Truth）。

请把你最终选择填在下面（直接写中文即可）：

1. AI 教练模型提供方：`（OpenAI / 用户自带 Key / 先不上 AI 等）`
2. 每日训练分发：`（全员同题 / 个性化）`
3. 评分用途：`（仅自我参考 / 进入排行榜）`
4. 周赛作品形态：`（URL / 截图 / URL+截图 / Repo 等）`
5. 内容治理：`（是否需要举报/屏蔽 MVP）`
6. 语言：`（中文优先 / 中英双语）`

如果你已经写在别处（比如你本地另一个文件/笔记），告诉我文件路径或直接粘贴，我会把它同步进来。

## 2. 今日可执行的实现范围（建议）

为了今天能“写完并验证”，我建议把实现拆成两类：

1. **必做（能上线的闭环）**
   - Auth 登录（Supabase）
   - 今日训练题展示 + 提交 prompt
   - AI Coach 反馈（先实现可插拔，支持 mock）
   - 保存 attempts 到 DB，并展示历史 attempts
2. **可延后（不影响闭环）**
   - 周赛（后续里程碑）
   - 复杂内容运营后台
   - 强防作弊与复杂治理

## 3. 工程拆解（按执行顺序）

### 3.1 基础工程脚手架（先把“可跑可测”打通）

目标：每次提交代码都能跑 `lint/typecheck/build`，避免堆积错误。

计划动作：

- 新增 npm scripts：
  - `typecheck`: `tsc --noEmit`
  - `test`: 单元测试（建议 Vitest）
  - `e2e`: 端到端测试（建议 Playwright，可选）
- 新增基础目录（建议）：
  - `lib/supabase/*`：Supabase client 封装
  - `app/api/*`：Route Handlers（coach 等）
  - `components/*`：业务组件
  - `components/ui/*`：shadcn/ui 生成的组件

验证方式（今天就能跑）：

- `npm run lint`
- `npm run typecheck`
- `npm run build`

### 3.2 Supabase 接入（Auth + DB）

目标：能登录、能写入/读取 drills 与 attempts。

计划动作：

- `.env.local` 增加（不提交到 git）：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 如需要服务端特权（可选）：`SUPABASE_SERVICE_ROLE_KEY`
- 代码封装：
  - `lib/supabase/client.ts`（浏览器端）
  - `lib/supabase/server.ts`（服务端，基于 cookies/session 的方案）
- 数据库 schema（建议以 SQL 文件形式跟踪在仓库里）：
  - `profiles`, `drills`, `drill_schedule`, `drill_attempts`
  - 周赛相关表可后置
- RLS（最小可用）：
  - drills/challenges public read
  - attempts 仅本人可读写

验证方式：

- 本地能跑起来 Next.js 并完成登录流程
- 训练题页能读到 drill
- 提交 prompt 后能写入 `drill_attempts`

### 3.3 今日训练（UI + 数据流）

目标：用户有完整训练闭环：看到题 -> 写 prompt -> 得到反馈 -> 再写。

计划动作：

- 路由与页面：
  - `/drills/today`：读取今日 drill（按 schedule 或按规则选择）
  - `/drills/[id]`：查看 drill 详情（便于分享/调试）
- UI 组件（用 shadcn/ui 快速搭）：
  - drill 内容展示：标题 + markdown 正文
  - prompt 输入：`Textarea`
  - 提交按钮 + loading 状态
  - coach 输出：结构化卡片（分数、缺失项、歧义项、建议补充问题、改写示例）
  - 历史 attempts 列表
- 数据流：
  - 页面加载：`drills` + 用户历史 attempts
  - 提交：调用 `/api/coach` -> 得到反馈 -> 保存到 `drill_attempts` -> UI 刷新

验证方式：

- 手动 smoke test（浏览器操作）
- 可选：Playwright 做 1 条 e2e 用例（只测页面渲染 + 提交按钮可用）

### 3.4 AI Coach（可插拔实现）

目标：先把接口与结构确定下来，模型提供方可以后换。

计划动作：

- `POST /api/coach`
  - 输入：`drill_id`, `prompt_text`, `attempt_index`
  - 输出：结构化 JSON（建议与 PRD rubric 对齐）
- 输入校验（建议 `zod`）：
  - 限制长度（避免巨额 token）
  - 过滤明显的敏感信息（至少提醒用户）
- 实现策略：
  1. **Mock Coach（必做）**：不依赖外部 key，返回固定结构，保证前端联调与测试稳定。
  2. **Real Coach（可选）**：配置 `OPENAI_API_KEY`（或你选择的 provider key）后启用真实调用。
- 成本控制（可后置，但建议留好口子）：
  - 限流（按 user_id / IP）
  - 每日次数上限
  - 缓存同 prompt 的结果（可选）

验证方式：

- 在没有任何 LLM key 的情况下，Mock Coach 能完整跑通 UI + DB 写入。
- 在有 key 的情况下，Real Coach 能返回结构化输出（并记录耗时与错误）。

## 4. 测试与质量门槛（今天能跑什么）

我建议把“今天能稳定跑完”的质量门槛定义为：

- `npm run lint` 通过
- `npm run typecheck` 通过
- `npm run build` 通过
- `npm run test`（最少 5-10 个单测，覆盖关键纯函数/解析逻辑/接口校验）

如果你希望再加一层保障：

- `npm run e2e`（Playwright）
  - 目标：至少覆盖 1 条核心路径（页面可打开 + 提交 prompt 看到 coach 结果）
  - 注：如果 Auth 流程要测，需要准备测试账号或使用 Supabase 的测试项目

## 5. 我今天自动编码与跑测试需要的“工具/能力清单”

这里分两类：我在这次对话环境可用的工具，以及项目本身需要的外部依赖/密钥。

### 5.1 我在本环境会用到的工具（Codex 内置能力）

- `functions.apply_patch`
  - 用途：创建/修改 Markdown、TS/TSX 源码文件
- `functions.shell_command`
  - 用途：运行命令（`npm i`, `npm run lint`, `npm run build`, `rg`, `git status` 等），查看输出并做修复
- Playwright MCP 工具（可选）
  - 用途：自动打开浏览器、执行点击/输入、做 e2e 冒烟测试、截图/抓取 console/network 日志
  - 备注：如果你想要“自动验收 UI”，这个非常有用

### 5.2 项目外部依赖（我需要你提供或你本地已有）

- Node.js + npm（你已经有并装了依赖）
- Supabase 项目（URL / anon key）
  - `.env.local` 中提供：
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 如果要服务端特权操作（可选）：
    - `SUPABASE_SERVICE_ROLE_KEY`（只允许在服务端使用）
- LLM Provider 的 key（如果要启用 Real Coach）
  - 例如：`OPENAI_API_KEY`

### 5.3 权限与边界说明

- 没有 Supabase key：我依然可以把 UI + Mock Coach + 类型检查/构建都做完，但无法验证真实登录与数据库读写。
- 没有 LLM key：我可以保证 Mock Coach 跑通与单测通过，但无法验证真实模型效果与成本。

## 6. 我建议你给我的最小输入（这样我能直接开始写代码）

如果你希望我“今天就开始编码 + 跑测试”，请给出：

1. 你对第 1 节 6 个决策的最终答案（哪怕是临时答案也行）
2. Supabase 的 `URL` 与 `anon key`（写到你的 `.env.local` 即可，我会读取）
3. 是否要今天接入真实 LLM（如果要，提供对应 key；如果不要，就先用 Mock）

