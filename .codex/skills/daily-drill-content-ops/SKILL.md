---
name: daily-drill-content-ops
description: Use this skill when creating or publishing daily PromptSkiller drills (prompt_case/code_case_multi/build_sim_case/template_case), including SQL seed authoring, naming conventions, schedule publishing, and idempotent database updates.
---

# Daily Drill Content Ops

Use this workflow when you need to add new drills and publish them for a given day.

## When To Use

- Create new drill content in batches (daily or weekly).
- Publish teaching template drills (`template_case`) with fixed 2-3 rounds.
- Add assets for code/simulation drills.
- Push daily schedule (`drill_schedule`) for slots 1/2/3.

## Canonical File Naming

All SQL seed files must live under `db/seed/` and use:

- `NNN_daily_YYYYMMDD_<topic>.sql`

Rules:

- `NNN` is 3-digit increasing prefix (required because `scripts/db.ps1 seed` sorts by filename).
- `YYYYMMDD` is publish date in UTC policy terms.
- `<topic>` uses lowercase + hyphen only.

Example:

- `011_daily_20260301_beginner-template-and-api.sql`

## Batch Structure (Single Daily SQL)

Keep one daily batch file with these optional sections in this order:

1. `drills` upsert (all new drills).
2. `drill_assets` upsert (for `code_case_multi` / `build_sim_case`).
3. `drill_template_rounds` upsert (for `template_case`).
4. `drill_module_items` upsert (optional, if new drills join modules).
5. `drill_schedule` upsert (publish slots for target day).

Always use idempotent writes:

- `insert ... on conflict (id) do update` for `drills`.
- `insert ... on conflict (drill_id, asset_kind, path) do update` for `drill_assets`.
- `insert ... on conflict (drill_id, round_no) do update` for `drill_template_rounds`.
- `insert ... on conflict (date, slot) do update` for `drill_schedule`.

## Drill-Type Authoring Checklist

### `prompt_case`

- Must have clear background, goal, constraints, and expected output shape.
- No assets required.

### `code_case_multi`

- Provide at least 2 `file` assets and 1 `log/spec` asset.
- Task should explicitly require multi-file reasoning and validation steps.

### `build_sim_case`

- Define round-by-round objectives in body text.
- Prefer `file/spec` assets for stable context.
- Require output constraints (`changed_files`, `patch_preview`, `risk_notes`).

### `template_case` (teaching board only)

- Body explains this is read-only teaching content.
- Add 2-3 records in `drill_template_rounds`.
- Each round should include:
  - `version_label` (e.g., beginner/improved/reference)
  - `prompt_text`
  - `teaching_notes_md` (why this round is better/worse)

## Publish Procedure

1. Create daily seed skeleton:
   - `powershell -ExecutionPolicy Bypass -File scripts/new-daily-seed.ps1 -BatchName <topic>`
2. Fill SQL sections with idempotent upserts.
3. Run:
   - `npm run db:seed`
   - `npm run db:status`
4. Verify counts and run smoke checks on:
   - `/drills`
   - `/drills/today`
   - `/drills/<template-case-id>` (for read-only board)

## Quality Gates Before Shipping

- New drills have unique IDs and valid `display_no`.
- `template_case` has at least 2 rounds.
- Schedule rows use `slot in (1,2,3)`.
- No `delete` statements in daily files.
- SQL file remains re-runnable without side effects.
