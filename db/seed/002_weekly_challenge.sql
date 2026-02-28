-- [PromptSkiller] Seed one active weekly challenge (idempotent-ish)
--
-- Strategy:
-- - Only insert a challenge if the table is empty.
-- - This avoids creating a new challenge every time you re-run seeds.

insert into public.weekly_challenges (slug, title, body_md, start_at, end_at)
select
  ('week-' || to_char(date_trunc('week', now()), 'YYYY-MM-DD')) as slug,
  '本周挑战：不写代码完成一个小功能' as title,
  $$
目标：
- 在“自己不手写一行代码”的前提下，完成一个可以展示的结果。
- 重点不是最终代码质量，而是你的提示词是否清晰、可复现、可验收。

提交要求：
1) 作品链接（URL / Repo / 截图链接均可）
2) Prompt Log（关键提示词，建议 3-10 条）
3) 可选：复现步骤、踩坑点、你学到的东西

评分（投票时大家参考）：
- 结果是否清晰可展示
- 提示词是否结构化（背景/目标/约束/输出格式/验收标准）
- 是否有迭代过程（v1 -> v2 -> v3）
$$ as body_md,
  date_trunc('week', now()) as start_at,
  date_trunc('week', now()) + interval '7 days' as end_at
where not exists (select 1 from public.weekly_challenges);

