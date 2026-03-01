-- [PromptSkiller] Drill sessions + round evaluations (C2)
-- This file is intended to be idempotent (safe to re-run).

-- =====================================================================
-- drill_sessions
-- =====================================================================
create table if not exists public.drill_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  drill_id text not null references public.drills(id) on delete restrict,
  feedback_mode text not null default 'guided',
  status text not null default 'in_progress',
  final_report_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

comment on table public.drill_sessions is
  'Per-user drill training sessions with guided/final-only feedback mode.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_sessions_feedback_mode_check'
      and conrelid = 'public.drill_sessions'::regclass
  ) then
    alter table public.drill_sessions
      add constraint drill_sessions_feedback_mode_check
      check (feedback_mode in ('guided', 'final_only'));
  end if;
exception
  when undefined_table then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_sessions_status_check'
      and conrelid = 'public.drill_sessions'::regclass
  ) then
    alter table public.drill_sessions
      add constraint drill_sessions_status_check
      check (status in ('in_progress', 'completed'));
  end if;
exception
  when undefined_table then null;
end $$;

create index if not exists drill_sessions_user_drill_created_idx
  on public.drill_sessions (user_id, drill_id, created_at desc);

create index if not exists drill_sessions_user_status_idx
  on public.drill_sessions (user_id, status, created_at desc);

create or replace function public.touch_drill_sessions_updated_at()
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
    select 1 from pg_trigger where tgname = 'drill_sessions_touch_updated_at'
  ) then
    create trigger drill_sessions_touch_updated_at
      before update on public.drill_sessions
      for each row
      execute function public.touch_drill_sessions_updated_at();
  end if;
end $$;

alter table public.drill_sessions enable row level security;

do $$
begin
  create policy "drill_sessions_select_own"
  on public.drill_sessions
  for select
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_sessions_insert_own"
  on public.drill_sessions
  for insert
  with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_sessions_update_own"
  on public.drill_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_sessions_delete_own"
  on public.drill_sessions
  for delete
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_sessions_select_admin"
  on public.drill_sessions
  for select
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
-- drill_session_rounds
-- =====================================================================
create table if not exists public.drill_session_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.drill_sessions(id) on delete cascade,
  round_no int not null,
  user_prompt_text text not null,
  model_output_json jsonb not null,
  round_eval_json jsonb not null,
  eval_visible_to_user boolean not null default true,
  workspace_state_json jsonb null,
  changed_files_json jsonb null,
  created_at timestamptz not null default now(),
  unique (session_id, round_no)
);

comment on table public.drill_session_rounds is
  'Per-round user prompt, model output and structured evaluation.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drill_session_rounds_round_no_check'
      and conrelid = 'public.drill_session_rounds'::regclass
  ) then
    alter table public.drill_session_rounds
      add constraint drill_session_rounds_round_no_check
      check (round_no > 0);
  end if;
exception
  when undefined_table then null;
end $$;

create index if not exists drill_session_rounds_session_round_idx
  on public.drill_session_rounds (session_id, round_no desc);

create index if not exists drill_session_rounds_session_created_idx
  on public.drill_session_rounds (session_id, created_at desc);

create or replace function public.touch_session_on_round_write()
returns trigger
language plpgsql
as $$
declare
  sid uuid;
begin
  sid := coalesce(new.session_id, old.session_id);
  if sid is not null then
    update public.drill_sessions
    set updated_at = now()
    where id = sid;
  end if;
  return coalesce(new, old);
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'drill_session_rounds_touch_session'
  ) then
    create trigger drill_session_rounds_touch_session
      after insert or update or delete on public.drill_session_rounds
      for each row
      execute function public.touch_session_on_round_write();
  end if;
end $$;

alter table public.drill_session_rounds enable row level security;

do $$
begin
  create policy "drill_session_rounds_select_own"
  on public.drill_session_rounds
  for select
  using (
    exists (
      select 1
      from public.drill_sessions s
      where s.id = drill_session_rounds.session_id
        and s.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_session_rounds_insert_own"
  on public.drill_session_rounds
  for insert
  with check (
    exists (
      select 1
      from public.drill_sessions s
      where s.id = drill_session_rounds.session_id
        and s.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_session_rounds_update_own"
  on public.drill_session_rounds
  for update
  using (
    exists (
      select 1
      from public.drill_sessions s
      where s.id = drill_session_rounds.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.drill_sessions s
      where s.id = drill_session_rounds.session_id
        and s.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_session_rounds_select_admin"
  on public.drill_session_rounds
  for select
  using (public.is_admin());
exception
  when duplicate_object then null;
end $$;
