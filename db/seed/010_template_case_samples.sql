-- [PromptSkiller] Seed template showcase drills (idempotent)

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
  'drill-template-beginner-todo-app-prompt',
  15,
  '样板题：从 0 到 1 描述一个待办清单程序（教学看板）',
  $$
这是一个用于教学视频的样板题，不是练习答题模式。

目标：
- 通过 3 轮固定提示词示例，讲解“如何把想要的程序描述清楚”。
- 让 0 基础用户理解：从模糊描述 -> 可执行描述 -> 标准提示词。

观看方式：
- 左侧看任务背景与约束；
- 右侧按轮次查看示例提示词与讲解要点；
- 本题不支持提交，不会进入评分流程。

教学任务场景：
- 让 AI 帮你写一个“待办清单”网页程序，支持新增、标记完成、删除、简单筛选。
- 要求界面清晰、移动端可用、代码结构易懂，适合新手学习。
$$,
  1,
  array['template','teaching','beginner','prompt-basics'],
  'template_case',
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

insert into public.drill_template_rounds (
  drill_id,
  round_no,
  version_label,
  prompt_text,
  teaching_notes_md
)
values
(
  'drill-template-beginner-todo-app-prompt',
  1,
  '第 1 版（小白描述）',
  $$
帮我写一个待办清单程序，界面好看一点，功能都做一下，代码不要太复杂。
$$,
  $$
问题点：
- 目标很泛，没有写清功能边界；
- “好看一点”“都做一下”不可验证；
- 没有输入输出和技术约束，AI 容易自由发挥。
$$
),
(
  'drill-template-beginner-todo-app-prompt',
  2,
  '第 2 版（有改进但仍有缺口）',
  $$
请你用 React 写一个待办清单页面，功能要有新增、删除、完成状态切换，最好再加个筛选。请给我完整代码。
$$,
  $$
改进点：
- 写了技术栈（React）；
- 列出了核心功能。

仍有问题：
- 没写数据结构和状态规则；
- 没写验收标准（什么叫“完成”）；
- 没写输出格式（单文件/多文件、是否要步骤解释）。
$$
),
(
  'drill-template-beginner-todo-app-prompt',
  3,
  '第 3 版（标准提示词示例）',
  $$
你是一名前端开发助手。请使用 React + TypeScript 生成一个“待办清单”最小可用程序，并按如下要求输出。

目标功能：
1) 新增待办事项（文本非空校验，去掉首尾空格）
2) 标记完成/未完成
3) 删除事项
4) 按状态筛选：全部 / 未完成 / 已完成

约束：
- 不使用第三方状态管理库；
- 数据先保存在组件内存中（不接后端）；
- 代码结构清晰，变量命名易懂，适合初学者阅读；
- 界面在手机宽度下可正常使用。

输出格式：
- 第一部分：文件结构说明（如果只有 1 个文件，也明确写出来）
- 第二部分：完整代码
- 第三部分：手动验收清单（至少 8 条）
- 第四部分：可选的下一步改进建议（不超过 5 条）
$$,
  $$
这版为什么可以作为教学标准：
- 有明确目标（功能列表）；
- 有硬约束（技术与边界）；
- 有交付格式（AI 不会乱答）；
- 有验收标准（可直接演示“怎么检查结果”）。
$$
)
on conflict (drill_id, round_no) do update set
  version_label = excluded.version_label,
  prompt_text = excluded.prompt_text,
  teaching_notes_md = excluded.teaching_notes_md,
  updated_at = now();
