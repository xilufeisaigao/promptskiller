-- [PromptSkiller] Drill modules (Sprint B)
-- This file is intended to be idempotent (safe to re-run).

-- =====================================================================
-- drill_modules
-- =====================================================================
create table if not exists public.drill_modules (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null,
  level text not null default 'starter',
  estimated_minutes int null,
  cover_style text null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.drill_modules is
  'Learning paths that group drills into ordered modules.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_modules_level_check'
      and conrelid = 'public.drill_modules'::regclass
  ) then
    alter table public.drill_modules
      add constraint drill_modules_level_check
      check (level in ('starter', 'intermediate', 'advanced'));
  end if;
exception
  when undefined_table then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_modules_estimated_minutes_check'
      and conrelid = 'public.drill_modules'::regclass
  ) then
    alter table public.drill_modules
      add constraint drill_modules_estimated_minutes_check
      check (estimated_minutes is null or estimated_minutes > 0);
  end if;
exception
  when undefined_table then null;
end $$;

create index if not exists drill_modules_published_idx
  on public.drill_modules (published_at desc nulls last, created_at desc);

create or replace function public.touch_drill_modules_updated_at()
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
    select 1 from pg_trigger where tgname = 'drill_modules_touch_updated_at'
  ) then
    create trigger drill_modules_touch_updated_at
      before update on public.drill_modules
      for each row
      execute function public.touch_drill_modules_updated_at();
  end if;
end $$;

alter table public.drill_modules enable row level security;

do $$
begin
  create policy "drill_modules_public_read"
  on public.drill_modules
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_modules_admin_insert"
  on public.drill_modules
  for insert
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_modules_admin_update"
  on public.drill_modules
  for update
  using (public.is_admin())
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_modules_admin_delete"
  on public.drill_modules
  for delete
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
-- drill_module_items
-- =====================================================================
create table if not exists public.drill_module_items (
  module_id text not null references public.drill_modules(id) on delete cascade,
  drill_id text not null references public.drills(id) on delete restrict,
  position int not null,
  created_at timestamptz not null default now(),
  primary key (module_id, drill_id)
);

comment on table public.drill_module_items is
  'Ordered drill items for each learning module.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_module_items_position_check'
      and conrelid = 'public.drill_module_items'::regclass
  ) then
    alter table public.drill_module_items
      add constraint drill_module_items_position_check
      check (position > 0);
  end if;
exception
  when undefined_table then null;
end $$;

create unique index if not exists drill_module_items_module_position_unique
  on public.drill_module_items (module_id, position);

create index if not exists drill_module_items_drill_idx
  on public.drill_module_items (drill_id, module_id);

alter table public.drill_module_items enable row level security;

do $$
begin
  create policy "drill_module_items_public_read"
  on public.drill_module_items
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_module_items_admin_insert"
  on public.drill_module_items
  for insert
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_module_items_admin_update"
  on public.drill_module_items
  for update
  using (public.is_admin())
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_module_items_admin_delete"
  on public.drill_module_items
  for delete
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;

-- Optional shortcut field on drills for quick module grouping.
alter table public.drills
  add column if not exists module_id text null references public.drill_modules(id) on delete set null;

create index if not exists drills_module_id_idx
  on public.drills (module_id);
