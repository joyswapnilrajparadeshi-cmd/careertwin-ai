-- CareerTwin AI Supabase Auth + role schema
-- Run after supabase_schema.sql.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'student' check (role in ('admin', 'mentor', 'student', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.career_plans enable row level security;

-- The Express server uses SUPABASE_SERVICE_ROLE_KEY for trusted database operations.
-- These policies are useful if you also call Supabase directly from a client later.

drop policy if exists "profiles read own or privileged" on public.profiles;
create policy "profiles read own or privileged"
on public.profiles for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'mentor')
  )
);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "plans read own or privileged" on public.career_plans;
create policy "plans read own or privileged"
on public.career_plans for select
using (
  auth.uid() = created_by
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'mentor')
  )
);

drop policy if exists "plans insert own" on public.career_plans;
create policy "plans insert own"
on public.career_plans for insert
with check (auth.uid() = created_by);

drop policy if exists "plans update own or privileged" on public.career_plans;
create policy "plans update own or privileged"
on public.career_plans for update
using (
  auth.uid() = created_by
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'mentor')
  )
);

drop policy if exists "plans delete own or privileged" on public.career_plans;
create policy "plans delete own or privileged"
on public.career_plans for delete
using (
  auth.uid() = created_by
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'mentor')
  )
);
