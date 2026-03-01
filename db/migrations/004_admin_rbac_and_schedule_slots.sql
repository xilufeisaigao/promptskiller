-- [PromptSkiller] Admin RBAC + drill schedule slots
-- This file is intended to be idempotent (safe to re-run).

-- =====================================================================
-- profiles: add admin flag + ensure profile rows exist for auth users
-- =====================================================================
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Whether this user is an admin (can manage drills/schedule and view all attempts).';

-- Backfill missing profile rows for existing auth users.
insert into public.profiles (id)
select u.id
from auth.users u
on conflict (id) do nothing;

-- Keep profile rows in sync for new signups.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_profile') then
    create trigger on_auth_user_created_profile
      after insert on auth.users
      for each row
      execute function public.handle_new_user_profile();
  end if;
end $$;

-- Helper function for RLS checks.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.is_admin = true
  );
$$;

comment on function public.is_admin(uuid) is
  'Returns true when the given user id belongs to an admin profile.';

-- =====================================================================
-- drills: admin can manage content
-- =====================================================================
do $$
begin
  create policy "drills_admin_insert"
  on public.drills
  for insert
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drills_admin_update"
  on public.drills
  for update
  using (public.is_admin())
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drills_admin_delete"
  on public.drills
  for delete
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
-- drill_schedule: support 3 slots/day and admin management
-- =====================================================================
alter table public.drill_schedule
  add column if not exists slot smallint;

update public.drill_schedule
set slot = 1
where slot is null;

alter table public.drill_schedule
  alter column slot set default 1;

alter table public.drill_schedule
  alter column slot set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_schedule_slot_check'
      and conrelid = 'public.drill_schedule'::regclass
  ) then
    alter table public.drill_schedule
      add constraint drill_schedule_slot_check
      check (slot between 1 and 3);
  end if;
exception
  when undefined_table then null;
end $$;

do $$
declare
  v_pk_name text;
  v_pk_def text;
begin
  select c.conname, pg_get_constraintdef(c.oid)
  into v_pk_name, v_pk_def
  from pg_constraint c
  where c.conrelid = 'public.drill_schedule'::regclass
    and c.contype = 'p'
  limit 1;

  if v_pk_name is not null and v_pk_def <> 'PRIMARY KEY (date, slot)' then
    execute format('alter table public.drill_schedule drop constraint %I', v_pk_name);
  end if;
exception
  when undefined_table then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.drill_schedule'::regclass
      and contype = 'p'
  ) then
    alter table public.drill_schedule
      add constraint drill_schedule_pkey primary key (date, slot);
  end if;
exception
  when undefined_table then null;
end $$;

create index if not exists drill_schedule_date_idx
  on public.drill_schedule (date);

do $$
begin
  create policy "drill_schedule_admin_insert"
  on public.drill_schedule
  for insert
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_schedule_admin_update"
  on public.drill_schedule
  for update
  using (public.is_admin())
  with check (public.is_admin());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_schedule_admin_delete"
  on public.drill_schedule
  for delete
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
-- drill_attempts: admin can read all attempts for ops/analytics
-- =====================================================================
do $$
begin
  create policy "drill_attempts_select_admin"
  on public.drill_attempts
  for select
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;

create index if not exists drill_attempts_drill_created_at
  on public.drill_attempts (drill_id, created_at desc);

