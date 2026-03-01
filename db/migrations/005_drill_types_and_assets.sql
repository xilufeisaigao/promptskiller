-- [PromptSkiller] Drill types + drill assets (C1)
-- This file is intended to be idempotent (safe to re-run).

-- =====================================================================
-- drills: add drill_type
-- =====================================================================
alter table public.drills
  add column if not exists drill_type text not null default 'prompt_case';

comment on column public.drills.drill_type is
  'Drill type: prompt_case | code_case_multi | build_sim_case';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drills_drill_type_check'
      and conrelid = 'public.drills'::regclass
  ) then
    alter table public.drills
      add constraint drills_drill_type_check
      check (drill_type in ('prompt_case', 'code_case_multi', 'build_sim_case'));
  end if;
exception
  when undefined_table then null;
end $$;

-- Backfill likely code-case rows from existing tags.
update public.drills
set drill_type = 'code_case_multi'
where drill_type = 'prompt_case'
  and tags is not null
  and (
    tags @> array['code-case']::text[]
    or tags @> array['multi-file-debug']::text[]
    or tags @> array['workflow-refactor']::text[]
  );

-- =====================================================================
-- drill_assets: structured attachments for code/sim drills
-- =====================================================================
create table if not exists public.drill_assets (
  id uuid primary key default gen_random_uuid(),
  drill_id text not null references public.drills(id) on delete cascade,
  asset_kind text not null,
  path text not null,
  content_text text not null,
  order_no int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.drill_assets is
  'Attachments for drills (file/log/spec), shown in training page tabs.';

comment on column public.drill_assets.asset_kind is
  'Attachment kind: file | log | spec';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_assets_kind_check'
      and conrelid = 'public.drill_assets'::regclass
  ) then
    alter table public.drill_assets
      add constraint drill_assets_kind_check
      check (asset_kind in ('file', 'log', 'spec'));
  end if;
exception
  when undefined_table then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_assets_order_no_check'
      and conrelid = 'public.drill_assets'::regclass
  ) then
    alter table public.drill_assets
      add constraint drill_assets_order_no_check
      check (order_no > 0);
  end if;
exception
  when undefined_table then null;
end $$;

create unique index if not exists drill_assets_drill_kind_path_unique
  on public.drill_assets (drill_id, asset_kind, path);

create index if not exists drill_assets_drill_kind_order_idx
  on public.drill_assets (drill_id, asset_kind, order_no, created_at);

create index if not exists drill_assets_drill_id_idx
  on public.drill_assets (drill_id);

create or replace function public.touch_drill_assets_updated_at()
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
    select 1 from pg_trigger where tgname = 'drill_assets_touch_updated_at'
  ) then
    create trigger drill_assets_touch_updated_at
      before update on public.drill_assets
      for each row
      execute function public.touch_drill_assets_updated_at();
  end if;
end $$;

alter table public.drill_assets enable row level security;

do $$
begin
  create policy "drill_assets_public_read"
  on public.drill_assets
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_assets_admin_insert"
  on public.drill_assets
  for insert
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_assets_admin_update"
  on public.drill_assets
  for update
  using (public.is_admin())
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_assets_admin_delete"
  on public.drill_assets
  for delete
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;
