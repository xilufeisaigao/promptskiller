-- [PromptSkiller] Template case drill type + showcase rounds
-- This file is intended to be idempotent (safe to re-run).

-- =====================================================================
-- drills: extend drill_type enum-like check with template_case
-- =====================================================================
do $$
declare
  v_exists boolean;
  v_has_template boolean;
begin
  select exists (
    select 1
    from pg_constraint
    where conname = 'drills_drill_type_check'
      and conrelid = 'public.drills'::regclass
  ) into v_exists;

  select exists (
    select 1
    from pg_constraint c
    where c.conname = 'drills_drill_type_check'
      and c.conrelid = 'public.drills'::regclass
      and pg_get_constraintdef(c.oid) like '%template_case%'
  ) into v_has_template;

  if v_exists and not v_has_template then
    alter table public.drills
      drop constraint drills_drill_type_check;
  end if;

  if not v_has_template then
    alter table public.drills
      add constraint drills_drill_type_check
      check (drill_type in ('prompt_case', 'code_case_multi', 'build_sim_case', 'template_case'));
  end if;
end $$;

comment on column public.drills.drill_type is
  'Drill type: prompt_case | code_case_multi | build_sim_case | template_case';

-- =====================================================================
-- drill_template_rounds: fixed prompt iteration board for teaching videos
-- =====================================================================
create table if not exists public.drill_template_rounds (
  id uuid primary key default gen_random_uuid(),
  drill_id text not null references public.drills(id) on delete cascade,
  round_no int not null,
  version_label text not null,
  prompt_text text not null,
  teaching_notes_md text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (drill_id, round_no)
);

comment on table public.drill_template_rounds is
  'Fixed template rounds for showcase/template drills. Used for read-only teaching boards.';

comment on column public.drill_template_rounds.version_label is
  'Display label for this round, e.g. Beginner Draft / Improved Draft / Reference Prompt.';

comment on column public.drill_template_rounds.teaching_notes_md is
  'Optional teaching notes shown next to each prompt iteration.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_template_rounds_round_no_check'
      and conrelid = 'public.drill_template_rounds'::regclass
  ) then
    alter table public.drill_template_rounds
      add constraint drill_template_rounds_round_no_check
      check (round_no > 0);
  end if;
exception
  when undefined_table then null;
end $$;

create index if not exists drill_template_rounds_drill_round_idx
  on public.drill_template_rounds (drill_id, round_no);

create or replace function public.touch_drill_template_rounds_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'drill_template_rounds_touch_updated_at'
  ) then
    create trigger drill_template_rounds_touch_updated_at
      before update on public.drill_template_rounds
      for each row
      execute function public.touch_drill_template_rounds_updated_at();
  end if;
end $$;

alter table public.drill_template_rounds enable row level security;

do $$
begin
  create policy "drill_template_rounds_public_read"
  on public.drill_template_rounds
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_template_rounds_admin_insert"
  on public.drill_template_rounds
  for insert
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_template_rounds_admin_update"
  on public.drill_template_rounds
  for update
  using (public.is_admin())
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_template_rounds_admin_delete"
  on public.drill_template_rounds
  for delete
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;
