-- [PromptSkiller] Add global incremental display number for drills
-- This file is intended to be idempotent (safe to re-run).

-- =====================================================================
-- Table: public.drills
--
-- Purpose:
-- - Add a human-friendly global incremental number for each drill.
-- - Used in UI for stable lookup (e.g., PS-001, PS-002).
--
-- Notes:
-- - `id` remains the canonical stable slug key.
-- - `display_no` is unique and auto-incremented by sequence.
-- =====================================================================

alter table public.drills
  add column if not exists display_no integer;

create sequence if not exists public.drills_display_no_seq
  start with 1
  increment by 1
  minvalue 1
  cache 1;

alter table public.drills
  alter column display_no
  set default nextval('public.drills_display_no_seq'::regclass);

-- Backfill missing numbers for existing rows.
with numbered as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as rn
  from public.drills
  where display_no is null
),
base as (
  select coalesce(max(display_no), 0) as max_no
  from public.drills
  where display_no is not null
)
update public.drills d
set display_no = base.max_no + numbered.rn
from numbered, base
where d.id = numbered.id;

create unique index if not exists drills_display_no_unique
  on public.drills (display_no);

alter table public.drills
  alter column display_no
  set not null;

comment on column public.drills.display_no is
  'Global incremental drill number for user-facing lookup (PS-001, PS-002, ...).';

-- Sync sequence cursor with existing max(display_no).
do $$
declare
  v_max bigint;
begin
  select max(display_no)::bigint into v_max from public.drills;

  if v_max is null or v_max < 1 then
    perform setval('public.drills_display_no_seq', 1, false);
  else
    perform setval('public.drills_display_no_seq', v_max, true);
  end if;
end $$;

