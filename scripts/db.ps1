param(
  [Parameter(Mandatory=$true)]
  [ValidateSet("migrate","seed","status")]
  [string]$Action
)

$ErrorActionPreference = "Stop"

function Load-DotEnvFile([string]$Path) {
  if (!(Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*$') { return }
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$') {
      Set-Item -Path ("Env:" + $matches[1]) -Value $matches[2]
    }
  }
}

function Find-PsqlPath() {
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $installRoot = "HKLM:\SOFTWARE\PostgreSQL\Installations"
  if (Test-Path $installRoot) {
    $inst = Get-ChildItem $installRoot | Select-Object -First 1
    if ($inst) {
      $props = Get-ItemProperty $inst.PSPath
      $base = $props.'Base Directory'
      if ($base) {
        $candidate = Join-Path $base "bin\psql.exe"
        if (Test-Path $candidate) { return $candidate }
      }
    }
  }

  throw "psql.exe not found. Ensure PostgreSQL client tools are installed or psql is on PATH."
}

function Get-OrderedSqlFiles([string]$Dir) {
  if (!(Test-Path $Dir)) { return @() }
  return Get-ChildItem -Path $Dir -Filter *.sql -File | Sort-Object Name
}

Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location ..

Load-DotEnvFile ".env.local"

if (-not $env:SUPABASE_DB_URL) {
  throw "Missing env var SUPABASE_DB_URL (set it in .env.local)."
}

$psql = Find-PsqlPath

if ($Action -eq "status") {
  & $psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -c "select current_user as whoami, now() as connected_at;" | Out-Host
  & $psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -c "select pg_size_pretty(pg_database_size(current_database())) as db_size, (select count(*)::int from pg_stat_activity where datname=current_database()) as connections;" | Out-Host
  & $psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -c "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name;" | Out-Host
  & $psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -c "select * from (select 'drills' as table_name, count(*)::int as rows from public.drills union all select 'drill_assets', count(*)::int from public.drill_assets union all select 'drill_template_rounds', count(*)::int from public.drill_template_rounds union all select 'drill_modules', count(*)::int from public.drill_modules union all select 'drill_module_items', count(*)::int from public.drill_module_items union all select 'drill_schedule', count(*)::int from public.drill_schedule union all select 'drill_attempts', count(*)::int from public.drill_attempts union all select 'drill_sessions', count(*)::int from public.drill_sessions union all select 'drill_session_rounds', count(*)::int from public.drill_session_rounds union all select 'drill_user_progress', count(*)::int from public.drill_user_progress union all select 'profiles', count(*)::int from public.profiles union all select 'weekly_challenges', count(*)::int from public.weekly_challenges union all select 'challenge_submissions', count(*)::int from public.challenge_submissions union all select 'submission_votes', count(*)::int from public.submission_votes) as t order by 1;" | Out-Host
  exit 0
}

if ($Action -eq "migrate") {
  $files = Get-OrderedSqlFiles "db/migrations"
  foreach ($f in $files) {
    Write-Host ("Applying migration: " + $f.FullName)
    & $psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $f.FullName | Out-Host
  }
  exit 0
}

if ($Action -eq "seed") {
  $files = Get-OrderedSqlFiles "db/seed"
  foreach ($f in $files) {
    Write-Host ("Applying seed: " + $f.FullName)
    & $psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $f.FullName | Out-Host
  }
  exit 0
}

throw "Unknown action: $Action"
