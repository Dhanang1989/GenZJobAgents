-- ZJobsAgent — Minggu 1: fondasi + Cek Loker Palsu (blueprint 05).
-- Tabel: users, consents, job_posts, scam_checks, scam_cache, scam_feedback (+ RLS, fungsi retensi).
-- Server (route handler) memakai service role; RLS tetap aktif untuk akses client di minggu berikutnya.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- users: cermin dari auth.users (dibuat via trigger)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  locale text not null default 'id-ID',
  onboarded_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- consents: bukti persetujuan UU PDP (append-only)
-- ---------------------------------------------------------------------------
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  purpose text not null check (purpose in ('cv_processing', 'ai_cross_border', 'marketing_email', 'anon_scam_training')),
  granted boolean not null,
  policy_version text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index consents_user_purpose_idx on public.consents (user_id, purpose, created_at desc);

-- ---------------------------------------------------------------------------
-- job_posts
-- ---------------------------------------------------------------------------
create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users (id) on delete set null,
  guest_key_hash text,
  source text not null check (source in ('url', 'text')),
  source_url text,
  domain text,
  content_hash text not null,
  sanitized_text text not null check (char_length(sanitized_text) <= 12000),
  title text,
  fetch_status text not null default 'n/a' check (fetch_status in ('ok', 'blocked', 'failed', 'n/a')),
  truncated boolean not null default false,
  user_reported jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index job_posts_content_hash_idx on public.job_posts (content_hash);
create index job_posts_created_by_idx on public.job_posts (created_by, created_at desc);

-- ---------------------------------------------------------------------------
-- scam_checks
-- ---------------------------------------------------------------------------
create table public.scam_checks (
  id uuid primary key default gen_random_uuid(),
  share_token uuid not null unique default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts (id) on delete cascade,
  user_id uuid references public.users (id) on delete cascade,
  guest_key_hash text,
  mode text not null check (mode in ('quick_scam', 'full')),
  verdict text not null check (verdict in ('AMAN', 'WASPADA', 'PALSU')),
  risk_score int not null check (risk_score between 0 and 100),
  rule_score int not null check (rule_score between 0 and 100),
  rule_hits jsonb not null default '[]'::jsonb,
  gate jsonb not null,
  llm_assessment jsonb,
  job_summary jsonb,
  timeline_highlights jsonb not null default '[]'::jsonb,
  rules_version text not null,
  prompt_version text,
  model text,
  from_cache boolean not null default false,
  degraded boolean not null default false,
  degraded_reason text,
  cost_usd numeric(10, 6),
  created_at timestamptz not null default now(),
  constraint scam_checks_owner check (user_id is not null or guest_key_hash is not null)
);
create index scam_checks_user_idx on public.scam_checks (user_id, created_at desc);
create index scam_checks_created_idx on public.scam_checks (created_at);
create index scam_checks_verdict_idx on public.scam_checks (verdict, created_at desc);

-- ---------------------------------------------------------------------------
-- scam_cache: hasil Agen 1 lintas pengguna, tanpa PII (blueprint 04 §5.5)
-- ---------------------------------------------------------------------------
create table public.scam_cache (
  cache_key text primary key,
  content_hash text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index scam_cache_expires_idx on public.scam_cache (expires_at);

-- ---------------------------------------------------------------------------
-- scam_feedback: "Laporkan salah deteksi" → tinjauan manual
-- ---------------------------------------------------------------------------
create table public.scam_feedback (
  id uuid primary key default gen_random_uuid(),
  scam_check_id uuid not null references public.scam_checks (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  claim text not null check (claim in ('false_positive', 'false_negative')),
  evidence_text text not null check (char_length(evidence_text) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reviewed_by uuid references public.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index scam_feedback_status_idx on public.scam_feedback (status, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.consents enable row level security;
alter table public.job_posts enable row level security;
alter table public.scam_checks enable row level security;
alter table public.scam_cache enable row level security;
alter table public.scam_feedback enable row level security;

create policy users_select_own on public.users for select to authenticated using (id = (select auth.uid()));
create policy users_update_own on public.users for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy consents_select_own on public.consents for select to authenticated using (user_id = (select auth.uid()));
create policy consents_insert_own on public.consents for insert to authenticated with check (user_id = (select auth.uid()));
-- tidak ada update/delete: append-only

create policy job_posts_select_own on public.job_posts for select to authenticated using (created_by = (select auth.uid()));
create policy scam_checks_select_own on public.scam_checks for select to authenticated using (user_id = (select auth.uid()));
create policy scam_feedback_select_own on public.scam_feedback for select to authenticated using (user_id = (select auth.uid()));
-- scam_cache: tanpa policy → hanya service role.
-- Halaman hasil publik (share_token) dilayani route server yang memasking kontak, bukan akses langsung client.

-- ---------------------------------------------------------------------------
-- Retensi (blueprint 05 §5) — panggil harian via cron (Vercel Cron / pg_cron)
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n_cache int; n_checks int; n_posts int;
begin
  delete from public.scam_cache where expires_at < now();
  get diagnostics n_cache = row_count;

  delete from public.scam_checks where user_id is null and created_at < now() - interval '30 days';
  get diagnostics n_checks = row_count;

  delete from public.job_posts p
  where p.created_at < now() - interval '90 days'
    and not exists (select 1 from public.scam_checks c where c.job_post_id = p.id);
  get diagnostics n_posts = row_count;

  return jsonb_build_object('scam_cache', n_cache, 'guest_scam_checks', n_checks, 'job_posts', n_posts);
end;
$$;
revoke all on function public.purge_expired() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
