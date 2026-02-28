-- [PromptSkiller] Initial schema (MVP)
-- This file is intended to be idempotent (safe to re-run).

-- Ensure common extensions exist (Supabase usually has them already).
create extension if not exists "pgcrypto" with schema extensions;

-- =====================================================================
-- Table: public.profiles
--
-- Purpose:
-- - Extends Supabase Auth users (auth.users) with public profile fields.
-- - MVP can work without it, but it becomes useful once you have:
--   - public handles (username)
--   - avatars
--   - display names separate from email
--
-- Access (RLS):
-- - public read (so profile can be shown on leaderboards etc.)
-- - only the owner (auth.uid = id) can insert/update their profile
-- =====================================================================
create table if not exists public.profiles (
  -- Primary key, same as auth.users.id
  -- - Using auth.users as the source of truth for identity.
  -- - on delete cascade: when an auth user is deleted, its profile is removed too.
  id uuid primary key references auth.users(id) on delete cascade,

  -- Public unique handle (username)
  -- - Optional at first.
  -- - Unique so it can be used in URLs later: /u/<handle>
  handle text unique,

  -- Display name shown in UI
  -- - Not necessarily unique.
  -- - Can be changed by user later.
  display_name text,

  -- Avatar URL (could be Supabase Storage public URL or external)
  -- - Kept as text for flexibility.
  avatar_url text,

  -- Record creation time (server-generated)
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$
begin
  create policy "profiles_public_read"
  on public.profiles
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
-- Table: public.drills
--
-- Purpose:
-- - Stores daily training scenarios ("drills") as content.
-- - Public readable so all users can view today's drill.
-- - Writes are intended to be done via admin/dashboard/service role (not via anon key).
--
-- Notes:
-- - Using text id (instead of uuid) makes it easier to keep stable slugs like:
--   'drill-debug-minimal-repro'
--
-- Access (RLS):
-- - public read
-- - (we do not define insert/update policies here; admin should manage content)
-- =====================================================================
create table if not exists public.drills (
  -- Stable content id / slug
  -- Example: 'drill-debug-minimal-repro'
  id text primary key,

  -- Drill title shown in list & header
  title text not null,

  -- Drill body in Markdown
  -- - Keep it short for MVP.
  -- - Do not store secrets; this is public content.
  body_md text not null,

  -- Difficulty (1-5)
  -- - Smallint to keep compact.
  -- - Default 1 for easy content.
  difficulty smallint not null default 1,

  -- Tags for filtering/recommendations later
  -- Example: {'debug','spec'}
  tags text[] null,

  -- Published time
  -- - If null: treat as unpublished/draft (optional behavior).
  -- - If non-null: content is released.
  published_at timestamptz null,

  -- Record creation time (server-generated)
  created_at timestamptz not null default now()
);

alter table public.drills enable row level security;

do $$
begin
  create policy "drills_public_read"
  on public.drills
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
-- Table: public.drill_schedule
--
-- Purpose:
-- - Maps a calendar date -> a drill id, so you can control what "today" means.
-- - In MVP we can also compute "today's drill" deterministically without this table,
--   but having it makes content ops easier later (manual override, special events).
--
-- Access (RLS):
-- - public read
-- - (writes should be admin-only; no insert/update policies in MVP)
-- =====================================================================
create table if not exists public.drill_schedule (
  -- The date this drill is scheduled for (use UTC date to avoid timezone debates)
  date date primary key,

  -- The drill shown on that date
  -- - on delete restrict: you must unschedule first before deleting a drill.
  drill_id text not null references public.drills(id) on delete restrict
);

alter table public.drill_schedule enable row level security;

do $$
begin
  create policy "drill_schedule_public_read"
  on public.drill_schedule
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
-- Table: public.drill_attempts
--
-- Purpose:
-- - Stores a user's prompt submissions (attempts) for a given drill.
-- - Each attempt records the prompt text + coach feedback (structured JSON) + score.
-- - This enables: history list, streaks, stats, leaderboards (later).
--
-- Access (RLS):
-- - select/insert/delete: only owner (auth.uid = user_id)
-- - update: not enabled in MVP (keeps history immutable; user can delete instead)
-- =====================================================================
create table if not exists public.drill_attempts (
  -- Attempt id (UUID)
  -- - Generated on the server.
  id uuid primary key default gen_random_uuid(),

  -- Owner id (auth.users.id)
  -- - Used for RLS owner checks (auth.uid() = user_id).
  -- - on delete cascade: deleting a user deletes their attempts.
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Which drill this attempt belongs to
  -- - on delete restrict: do not allow deleting drills that already have attempts.
  drill_id text not null references public.drills(id) on delete restrict,

  -- User's prompt text (what they would send to an AI model)
  -- - Keep it as plain text for MVP.
  -- - We should later add UI warnings not to paste secrets.
  prompt_text text not null,

  -- Coach mode used to generate feedback
  -- Example values:
  -- - 'mock'   : deterministic local heuristic feedback
  -- - 'openai' : real model feedback (user provided API key)
  coach_mode text not null default 'mock',

  -- Structured coach feedback as JSON
  -- Expected shape (MVP):
  -- - score_total: 0-100
  -- - scores: { context, constraints, output_format, acceptance_criteria, tests_and_edge_cases } (0-20)
  -- - missing_items: string[]
  -- - ambiguities: string[]
  -- - suggested_questions_to_answer: string[]
  -- - rewrite_example?: string | null
  coach_feedback jsonb not null,

  -- Denormalized total score (0-100)
  -- - Stored as int for easy sorting/aggregation.
  -- - Redundant with coach_feedback.score_total, but avoids JSON extraction in queries.
  score_total int not null,

  -- Attempt creation time (server-generated)
  created_at timestamptz not null default now()
);

create index if not exists drill_attempts_user_drill_created_at
  on public.drill_attempts (user_id, drill_id, created_at desc);

create index if not exists drill_attempts_user_created_at
  on public.drill_attempts (user_id, created_at desc);

alter table public.drill_attempts enable row level security;

do $$
begin
  create policy "drill_attempts_select_own"
  on public.drill_attempts
  for select
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_attempts_insert_own"
  on public.drill_attempts
  for insert
  with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "drill_attempts_delete_own"
  on public.drill_attempts
  for delete
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;
