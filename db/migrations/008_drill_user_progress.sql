-- [PromptSkiller] User drill progress (cloud progress for modules)
-- This file is intended to be idempotent (safe to re-run).

create table if not exists public.drill_user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  drill_id text not null references public.drills(id) on delete cascade,
  first_practiced_at timestamptz not null default now(),
  last_practiced_at timestamptz not null default now(),
  attempt_count int not null default 0,
  best_score int null,
  last_score int null,
  updated_at timestamptz not null default now(),
  primary key (user_id, drill_id)
);

comment on table public.drill_user_progress is
  'Per-user drill progress aggregated from drill_attempts inserts.';

comment on column public.drill_user_progress.attempt_count is
  'Total number of attempts submitted by this user for this drill.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_user_progress_attempt_count_check'
      and conrelid = 'public.drill_user_progress'::regclass
  ) then
    alter table public.drill_user_progress
      add constraint drill_user_progress_attempt_count_check
      check (attempt_count >= 0);
  end if;
exception
  when undefined_table then null;
end $$;

create index if not exists drill_user_progress_user_last_practiced_idx
  on public.drill_user_progress (user_id, last_practiced_at desc);

create index if not exists drill_user_progress_drill_best_score_idx
  on public.drill_user_progress (drill_id, best_score desc nulls last);

create or replace function public.touch_drill_user_progress_updated_at()
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
    select 1 from pg_trigger where tgname = 'drill_user_progress_touch_updated_at'
  ) then
    create trigger drill_user_progress_touch_updated_at
      before update on public.drill_user_progress
      for each row
      execute function public.touch_drill_user_progress_updated_at();
  end if;
end $$;

create or replace function public.on_drill_attempt_insert_upsert_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.drill_user_progress (
    user_id,
    drill_id,
    first_practiced_at,
    last_practiced_at,
    attempt_count,
    best_score,
    last_score
  )
  values (
    new.user_id,
    new.drill_id,
    new.created_at,
    new.created_at,
    1,
    new.score_total,
    new.score_total
  )
  on conflict (user_id, drill_id)
  do update set
    last_practiced_at = excluded.last_practiced_at,
    attempt_count = public.drill_user_progress.attempt_count + 1,
    best_score = case
      when public.drill_user_progress.best_score is null then excluded.best_score
      else greatest(public.drill_user_progress.best_score, excluded.best_score)
    end,
    last_score = excluded.last_score,
    updated_at = now();

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'drill_attempts_upsert_progress'
  ) then
    create trigger drill_attempts_upsert_progress
      after insert on public.drill_attempts
      for each row
      execute function public.on_drill_attempt_insert_upsert_progress();
  end if;
end $$;

-- backfill from existing attempts
insert into public.drill_user_progress (
  user_id,
  drill_id,
  first_practiced_at,
  last_practiced_at,
  attempt_count,
  best_score,
  last_score
)
select
  a.user_id,
  a.drill_id,
  min(a.created_at) as first_practiced_at,
  max(a.created_at) as last_practiced_at,
  count(*)::int as attempt_count,
  max(a.score_total)::int as best_score,
  (
    select a2.score_total
    from public.drill_attempts a2
    where a2.user_id = a.user_id
      and a2.drill_id = a.drill_id
    order by a2.created_at desc
    limit 1
  )::int as last_score
from public.drill_attempts a
group by a.user_id, a.drill_id
on conflict (user_id, drill_id)
do update set
  first_practiced_at = least(public.drill_user_progress.first_practiced_at, excluded.first_practiced_at),
  last_practiced_at = greatest(public.drill_user_progress.last_practiced_at, excluded.last_practiced_at),
  attempt_count = greatest(public.drill_user_progress.attempt_count, excluded.attempt_count),
  best_score = case
    when public.drill_user_progress.best_score is null then excluded.best_score
    when excluded.best_score is null then public.drill_user_progress.best_score
    else greatest(public.drill_user_progress.best_score, excluded.best_score)
  end,
  last_score = coalesce(excluded.last_score, public.drill_user_progress.last_score),
  updated_at = now();

alter table public.drill_user_progress enable row level security;

do $$
begin
  create policy "drill_user_progress_select_own"
  on public.drill_user_progress
  for select
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_user_progress_select_admin"
  on public.drill_user_progress
  for select
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;

-- only system triggers/service role should write; no public insert/update policy
