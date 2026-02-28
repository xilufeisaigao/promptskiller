-- [PromptSkiller] Weekly challenges + submissions + voting (MVP)
-- This file is intended to be idempotent (safe to re-run).

-- =====================================================================
-- Helper: updated_at trigger
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- Table: public.weekly_challenges
--
-- Purpose:
-- - Stores weekly "competition" topics.
-- - Public read (anyone can browse the challenge of the week).
-- - Writes are intended to be admin/dashboard/service-role only (MVP does not expose write policies).
--
-- Notes:
-- - We include a unique slug so URLs can be stable and readable: /challenges/<slug>
-- =====================================================================
create table if not exists public.weekly_challenges (
  -- Primary key (UUID)
  id uuid primary key default gen_random_uuid(),

  -- Stable readable slug for routing
  -- Example: 'week-2026-02-23'
  slug text not null unique,

  -- Challenge title shown in list and detail page
  title text not null,

  -- Challenge description in Markdown
  body_md text not null,

  -- Challenge start time (UTC recommended)
  start_at timestamptz not null,

  -- Challenge end time (UTC recommended)
  end_at timestamptz not null,

  -- Record creation time (server-generated)
  created_at timestamptz not null default now()
);

alter table public.weekly_challenges enable row level security;

do $$
begin
  create policy "weekly_challenges_public_read"
  on public.weekly_challenges
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
-- Table: public.challenge_submissions
--
-- Purpose:
-- - Stores user submissions for a weekly challenge.
-- - Public read: so people can browse/vote/share results.
-- - One submission per user per challenge (unique(challenge_id, user_id)).
--
-- Core fields:
-- - artifact_url: link to demo/repo/image
-- - prompt_log_md: the key prompts used (the learning value)
-- - votes_count: denormalized counter for quick list rendering
--
-- Access (RLS):
-- - select: public
-- - insert/update/delete: only owner
-- - insert/update only allowed while challenge is active (now between start_at and end_at)
-- =====================================================================
create table if not exists public.challenge_submissions (
  -- Primary key (UUID)
  id uuid primary key default gen_random_uuid(),

  -- The weekly challenge this submission belongs to
  challenge_id uuid not null references public.weekly_challenges(id) on delete cascade,

  -- Owner id (auth.users.id)
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Link to the artifact (demo URL, repo URL, image URL, etc.)
  artifact_url text not null,

  -- Artifact type (kept as text for MVP flexibility)
  -- Example: 'url' | 'repo' | 'image'
  artifact_type text not null default 'url',

  -- Key prompts used, in Markdown (this is the "learning payload")
  prompt_log_md text not null default '',

  -- Optional notes/explanation
  notes text null,

  -- Denormalized vote counter for fast reads
  votes_count int not null default 0,

  -- Record creation time (server-generated)
  created_at timestamptz not null default now(),

  -- Record update time (server-generated via trigger)
  updated_at timestamptz not null default now()
);

create unique index if not exists challenge_submissions_unique_user_per_challenge
  on public.challenge_submissions (challenge_id, user_id);

create index if not exists challenge_submissions_by_challenge_created_at
  on public.challenge_submissions (challenge_id, created_at desc);

alter table public.challenge_submissions enable row level security;

-- updated_at trigger
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'challenge_submissions_set_updated_at') then
    create trigger challenge_submissions_set_updated_at
    before update on public.challenge_submissions
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  create policy "challenge_submissions_public_read"
  on public.challenge_submissions
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "challenge_submissions_insert_own_active_only"
  on public.challenge_submissions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.weekly_challenges c
      where c.id = challenge_id
        and now() >= c.start_at
        and now() <= c.end_at
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "challenge_submissions_update_own_active_only"
  on public.challenge_submissions
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.weekly_challenges c
      where c.id = challenge_id
        and now() >= c.start_at
        and now() <= c.end_at
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.weekly_challenges c
      where c.id = challenge_id
        and now() >= c.start_at
        and now() <= c.end_at
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "challenge_submissions_delete_own"
  on public.challenge_submissions
  for delete
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
-- Table: public.submission_votes
--
-- Purpose:
-- - Stores upvotes for challenge submissions.
-- - One vote per user per submission (unique(submission_id, voter_id)).
-- - Public read so we can render vote counts if needed (we mostly use votes_count).
--
-- Access (RLS):
-- - select: public
-- - insert/delete: only the voter
-- - prevent self-vote in policy (optional)
--
-- Counter maintenance:
-- - insert increments challenge_submissions.votes_count
-- - delete decrements challenge_submissions.votes_count
-- =====================================================================
create table if not exists public.submission_votes (
  -- Primary key (UUID)
  id uuid primary key default gen_random_uuid(),

  -- Which submission is being voted
  submission_id uuid not null references public.challenge_submissions(id) on delete cascade,

  -- The voting user
  voter_id uuid not null references auth.users(id) on delete cascade,

  -- Record creation time (server-generated)
  created_at timestamptz not null default now()
);

create unique index if not exists submission_votes_unique_voter_per_submission
  on public.submission_votes (submission_id, voter_id);

create index if not exists submission_votes_by_submission_created_at
  on public.submission_votes (submission_id, created_at desc);

alter table public.submission_votes enable row level security;

do $$
begin
  create policy "submission_votes_public_read"
  on public.submission_votes
  for select
  using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "submission_votes_insert_own_no_self_vote"
  on public.submission_votes
  for insert
  with check (
    auth.uid() = voter_id
    and not exists (
      select 1
      from public.challenge_submissions s
      where s.id = submission_id
        and s.user_id = auth.uid()
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "submission_votes_delete_own"
  on public.submission_votes
  for delete
  using (auth.uid() = voter_id);
exception
  when duplicate_object then null;
end $$;

-- Vote counter triggers
create or replace function public.submission_votes_inc_counter()
returns trigger
language plpgsql
as $$
begin
  update public.challenge_submissions
    set votes_count = votes_count + 1
  where id = new.submission_id;
  return new;
end;
$$;

create or replace function public.submission_votes_dec_counter()
returns trigger
language plpgsql
as $$
begin
  update public.challenge_submissions
    set votes_count = greatest(votes_count - 1, 0)
  where id = old.submission_id;
  return old;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'submission_votes_after_insert') then
    create trigger submission_votes_after_insert
    after insert on public.submission_votes
    for each row execute function public.submission_votes_inc_counter();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'submission_votes_after_delete') then
    create trigger submission_votes_after_delete
    after delete on public.submission_votes
    for each row execute function public.submission_votes_dec_counter();
  end if;
end $$;

