-- [PromptSkiller] Daily batch seed (20260301)
-- Topic: vibe-coding-beginner-first-tool
-- This file is idempotent: safe to re-run.

-- 1) drills upsert (template_case + practice prompt_case)
insert into public.drills (
  id,
  display_no,
  title,
  body_md,
  difficulty,
  tags,
  drill_type,
  published_at
)
values
(
  'drill-template-vibe-coding-lottery-tool',
  101,
  '样板题：氛围编程入门，描述一个“随机抽签”网页小工具（教学看板）',
  $$
这是一个用于教学视频的样板题，不是练习答题模式。

目标：
- 用 3 轮固定提示词示例，讲清楚：不会写代码也能通过“描述需求”驱动 AI 做出可运行的小工具。
- 演示“需求 5 件套”：背景/目标/约束/输出格式/验收清单。

场景：
- 你想要一个“随机抽签”网页小工具：
  - 粘贴一份名单（每行一个名字）
  - 点击按钮随机抽取 1 个
  - 支持“不重复抽取”（抽过的进入已抽列表）
  - 支持重置
- 要求界面清晰、手机也能用、代码易读。

观看方式：
- 左侧看任务背景与约束；
- 右侧按轮次查看示例提示词与讲解要点；
- 本题不支持提交，不会进入评分流程。
$$,
  1,
  array['template','teaching','beginner','vibe-coding','prompt-basics'],
  'template_case',
  now()
),
(
  'drill-vibe-coding-five-parts-practice',
  102,
  '练习题：用“需求 5 件套”描述一个你想要的网页小工具',
  $$
你准备让 AI 帮你做一个“能直接在浏览器里打开使用”的小网页工具。

你可以选一个你喜欢的场景（任选其一即可）：
- 随机抽签/抽奖小工具
- 计数器（点击 +1 / 重置）
- 待办清单（新增/完成/删除）
- 简单记账（新增记录/统计总额）

目标：
1) 写一段你会发给 AI 的提示词；
2) 你的提示词必须包含“需求 5 件套”：背景、目标、约束、输出格式、验收清单；
3) 要求 AI 先复述需求，再开始给出代码。

约束：
- 你不需要懂代码细节，但你要把交互说清楚；
- 尽量写出边界情况（例如：空输入、重复项、极端情况）。

输出：
- 你写的提示词（建议 200-500 字）。
$$,
  1,
  array['beginner','vibe-coding','prompt-basics','spec-writing'],
  'prompt_case',
  now()
),
(
  'drill-vibe-coding-output-format-practice',
  103,
  '练习题：用“输出格式”把 AI 的交付牢牢控制住',
  $$
场景：你想让 AI 帮你做一个“登录表单”页面（不接后端）。

功能需求：
- 输入：邮箱、密码
- 交互：显示/隐藏密码
- 校验：邮箱格式不对时提示；密码为空时提示
- 提交：点击提交后在页面上显示“成功/失败”的提示（用假数据模拟即可）

目标：
- 这题重点练“输出格式”：你的提示词要强制 AI 按你指定的结构输出。

约束：
- 做成一个可以直接在浏览器打开运行的单文件网页；
- 手机宽度下也能正常使用；
- 不要给多套方案，只给一个可运行版本。

你写提示词时必须要求 AI 按顺序输出：
1) 一句话运行方式
2) 文件结构（应该只有 1 个文件）
3) 完整代码
4) 手动验收清单（至少 10 条）
5) 下一步改进建议（不超过 5 条）

输出：
- 你写的提示词。
$$,
  2,
  array['beginner','vibe-coding','output-format','acceptance-criteria'],
  'prompt_case',
  now()
),
(
  'drill-vibe-coding-clarify-then-build-practice',
  104,
  '练习题：让 AI 先问清楚再动手，并给出迭代计划',
  $$
你准备做一个“小目标明确、但细节很多”的功能，让 AI 当你的开发搭子。

场景（任选其一即可）：
- 一个“排行榜页面”（支持筛选与分页）
- 一个“文件上传表单”（支持进度条与失败重试）
- 一个“个人资料编辑页”（支持编辑/取消/保存）

目标：
1) 写提示词要求 AI 先提出澄清问题（至少 8 个）；
2) 等你回答前，AI 不能直接给代码；
3) 在你回答后，AI 要给出一个 3 轮迭代计划（每轮有目标与验收点）。

输出：
- 你写的提示词。
$$,
  2,
  array['beginner','vibe-coding','iteration','process-control'],
  'prompt_case',
  now()
)
on conflict (id) do update set
  display_no = excluded.display_no,
  title = excluded.title,
  body_md = excluded.body_md,
  difficulty = excluded.difficulty,
  tags = excluded.tags,
  drill_type = excluded.drill_type,
  published_at = excluded.published_at;

-- 2) drill_template_rounds upsert (固定 3 轮样板)
insert into public.drill_template_rounds (
  drill_id,
  round_no,
  version_label,
  prompt_text,
  teaching_notes_md
)
values
(
  'drill-template-vibe-coding-lottery-tool',
  1,
  '第 1 版（小白描述）',
  $$
帮我做一个随机抽签网页，界面好看一点，功能都做一下。
$$,
  $$
问题点：
- 目标很泛，“功能都做一下”没有边界；
- “好看一点”不可验证；
- 没有说明输入方式、输出样子、异常处理；
- 没有约束与验收标准，AI 容易自由发挥。
$$
),
(
  'drill-template-vibe-coding-lottery-tool',
  2,
  '第 2 版（有改进但仍有缺口）',
  $$
请帮我做一个可以直接在浏览器打开运行的“随机抽签”小网页。

功能：
- 我粘贴一份名单（每行一个名字）
- 点击按钮随机抽取 1 个名字并展示
- 抽过的名字不要再被抽到（要有已抽列表）
- 支持一键重置

请给我完整代码。
$$,
  $$
改进点：
- 功能列表更清晰；
- 说明了“可直接打开运行”，减少环境歧义。

仍有问题：
- 没写输入清洗规则（空行、重复、空格）；
- 没写边界行为（名单为空、抽完了怎么办）；
- 没规定输出结构（要不要说明运行方式、验收清单）。
$$
),
(
  'drill-template-vibe-coding-lottery-tool',
  3,
  '第 3 版（标准提示词示例）',
  $$
你是一名前端开发助手。请生成一个“随机抽签”网页小工具，要求可以离线运行。

目标功能：
1) 名单输入：一个多行文本框，每行一个名字；去掉首尾空格；空行忽略；去重（同名只保留一个）
2) 开始抽取：点击“抽一个”，从未抽名单里随机抽取 1 个并显示结果
3) 不重复：抽过的名字移动到“已抽列表”，后续不再被抽到
4) 重置：一键清空已抽结果，回到初始状态
5) 适配手机：手机宽度下布局不挤压，按钮可点击

约束：
- 只用原生浏览器能力，不依赖第三方库，不需要联网
- 所有代码放在一个文件里，打开就能用
- 代码要适合新手阅读：变量名清晰、分函数、注释少而关键

输出格式（必须按顺序）：
A) 一句话说明怎么运行
B) 文件结构（应该只有 1 个文件）
C) 完整代码（请直接给出可复制的内容）
D) 手动验收清单（至少 10 条，包含边界情况）
E) 你认为最值得的 3 个下一步改进（不超过 3 条）
$$,
  $$
这版为什么适合当教学标准：
- 功能边界清晰；
- 约束明确，减少 AI 乱发挥；
- 输出格式把交付“锁死”；
- 验收清单让你不会写代码也能检查结果。
$$
)
on conflict (drill_id, round_no) do update set
  version_label = excluded.version_label,
  prompt_text = excluded.prompt_text,
  teaching_notes_md = excluded.teaching_notes_md,
  updated_at = now();

-- 3) drill_schedule upsert (publish for UTC 2026-03-01)
insert into public.drill_schedule (date, slot, drill_id)
values
('2026-03-01', 1, 'drill-template-vibe-coding-lottery-tool'),
('2026-03-01', 2, 'drill-vibe-coding-five-parts-practice'),
('2026-03-01', 3, 'drill-vibe-coding-output-format-practice')
on conflict (date, slot) do update set
  drill_id = excluded.drill_id;
