-- [PromptSkiller] Extend drill assets kind with image
-- Idempotent migration: safe to re-run.

do $$
declare
  v_exists boolean;
  v_has_image boolean;
begin
  select exists (
    select 1
    from pg_constraint
    where conname = 'drill_assets_kind_check'
      and conrelid = 'public.drill_assets'::regclass
  ) into v_exists;

  select exists (
    select 1
    from pg_constraint c
    where c.conname = 'drill_assets_kind_check'
      and c.conrelid = 'public.drill_assets'::regclass
      and pg_get_constraintdef(c.oid) like '%image%'
  ) into v_has_image;

  if v_exists and not v_has_image then
    alter table public.drill_assets
      drop constraint drill_assets_kind_check;
  end if;

  if not v_has_image then
    alter table public.drill_assets
      add constraint drill_assets_kind_check
      check (asset_kind in ('file', 'log', 'spec', 'image'));
  end if;
end $$;

comment on column public.drill_assets.asset_kind is
  'Attachment kind: file | log | spec | image';
