-- [PromptSkiller] Coach/Exam mode split baseline
-- Idempotent migration: safe to re-run.

-- =====================================================================
-- drills: add mode visibility and exam metadata
-- =====================================================================
alter table public.drills
  add column if not exists mode_visibility text[] not null default array['coach']::text[],
  add column if not exists capability_domain text not null default 'coding',
  add column if not exists exam_track text null,
  add column if not exists exam_time_limit_sec int null,
  add column if not exists exam_submission_limit int null;

comment on column public.drills.mode_visibility is
  'Drill visibility by mode: coach/exam.';

comment on column public.drills.capability_domain is
  'Capability domain: coding/docs/tools/life.';

comment on column public.drills.exam_track is
  'Exam track when visible in exam mode: debug/feature/from_zero.';

comment on column public.drills.exam_time_limit_sec is
  'Optional exam time limit (seconds).';

comment on column public.drills.exam_submission_limit is
  'Optional exam submission cap for a session.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drills_mode_visibility_check'
      and conrelid = 'public.drills'::regclass
  ) then
    alter table public.drills
      add constraint drills_mode_visibility_check
      check (
        array_length(mode_visibility, 1) >= 1
        and mode_visibility <@ array['coach', 'exam']::text[]
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drills_capability_domain_check'
      and conrelid = 'public.drills'::regclass
  ) then
    alter table public.drills
      add constraint drills_capability_domain_check
      check (capability_domain in ('coding', 'docs', 'tools', 'life'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drills_exam_track_check'
      and conrelid = 'public.drills'::regclass
  ) then
    alter table public.drills
      add constraint drills_exam_track_check
      check (exam_track is null or exam_track in ('debug', 'feature', 'from_zero'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drills_exam_time_limit_check'
      and conrelid = 'public.drills'::regclass
  ) then
    alter table public.drills
      add constraint drills_exam_time_limit_check
      check (exam_time_limit_sec is null or exam_time_limit_sec > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drills_exam_submission_limit_check'
      and conrelid = 'public.drills'::regclass
  ) then
    alter table public.drills
      add constraint drills_exam_submission_limit_check
      check (exam_submission_limit is null or exam_submission_limit > 0);
  end if;
end $$;

create index if not exists drills_mode_visibility_gin_idx
  on public.drills using gin (mode_visibility);

create index if not exists drills_capability_domain_idx
  on public.drills (capability_domain);

create index if not exists drills_exam_track_idx
  on public.drills (exam_track);

-- In case of a previously interrupted run, remove the strict exam-track
-- constraint before backfill, then re-create it after data is normalized.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'drills_exam_track_required_when_exam_visible_check'
      and conrelid = 'public.drills'::regclass
  ) then
    alter table public.drills
      drop constraint drills_exam_track_required_when_exam_visible_check;
  end if;
end $$;

-- Backfill mode visibility and exam track for existing drills.
update public.drills
set mode_visibility = case
  when drill_type = 'template_case' then array['coach']::text[]
  when drill_type in ('code_case_multi', 'build_sim_case') then array['coach', 'exam']::text[]
  when drill_type = 'prompt_case' and exists (
    select 1
    from unnest(coalesce(tags, array[]::text[])) as t(tag)
    where lower(t.tag) in ('debug', 'feature', 'from_zero')
  ) then array['coach', 'exam']::text[]
  else array['coach']::text[]
end;

update public.drills
set capability_domain = case
  when exists (
    select 1
    from unnest(coalesce(tags, array[]::text[])) as t(tag)
    where lower(t.tag) in ('docs', 'doc', 'pdf')
  ) then 'docs'
  when exists (
    select 1
    from unnest(coalesce(tags, array[]::text[])) as t(tag)
    where lower(t.tag) in ('tools', 'tooling', 'automation')
  ) then 'tools'
  when exists (
    select 1
    from unnest(coalesce(tags, array[]::text[])) as t(tag)
    where lower(t.tag) in ('life', 'daily-life')
  ) then 'life'
  else 'coding'
end;

update public.drills
set exam_track = case
  when not ('exam' = any(mode_visibility)) then null
  when drill_type = 'code_case_multi' then coalesce(exam_track, 'debug')
  when drill_type = 'build_sim_case' then coalesce(exam_track, 'from_zero')
  when drill_type = 'prompt_case' then coalesce(exam_track, 'feature')
  else exam_track
end;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drills_exam_track_required_when_exam_visible_check'
      and conrelid = 'public.drills'::regclass
  ) then
    alter table public.drills
      add constraint drills_exam_track_required_when_exam_visible_check
      check (
        not ('exam' = any(mode_visibility))
        or exam_track is not null
      );
  end if;
end $$;

-- =====================================================================
-- drill_sessions: add session mode and exam policy snapshot
-- =====================================================================
alter table public.drill_sessions
  add column if not exists session_mode text not null default 'coach',
  add column if not exists exam_policy_json jsonb null;

comment on column public.drill_sessions.session_mode is
  'Session mode: coach/exam.';

comment on column public.drill_sessions.exam_policy_json is
  'Frozen exam policy snapshot for the session.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drill_sessions_session_mode_check'
      and conrelid = 'public.drill_sessions'::regclass
  ) then
    alter table public.drill_sessions
      add constraint drill_sessions_session_mode_check
      check (session_mode in ('coach', 'exam'));
  end if;
end $$;

create index if not exists drill_sessions_session_mode_idx
  on public.drill_sessions (session_mode);

update public.drill_sessions s
set session_mode = case
  when d.mode_visibility @> array['exam']::text[] then 'exam'
  else 'coach'
end
from public.drills d
where d.id = s.drill_id;

-- =====================================================================
-- drill_attempts: add session mode for stats split
-- =====================================================================
alter table public.drill_attempts
  add column if not exists session_mode text not null default 'coach';

comment on column public.drill_attempts.session_mode is
  'Attempt mode: coach/exam.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drill_attempts_session_mode_check'
      and conrelid = 'public.drill_attempts'::regclass
  ) then
    alter table public.drill_attempts
      add constraint drill_attempts_session_mode_check
      check (session_mode in ('coach', 'exam'));
  end if;
end $$;

create index if not exists drill_attempts_session_mode_idx
  on public.drill_attempts (session_mode);

update public.drill_attempts a
set session_mode = case
  when d.mode_visibility @> array['exam']::text[] then 'exam'
  else 'coach'
end
from public.drills d
where d.id = a.drill_id;
