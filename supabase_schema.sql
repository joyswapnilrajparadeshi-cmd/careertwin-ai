-- CareerTwin AI database schema
-- Run this in Supabase SQL Editor after creating a project.

create extension if not exists "pgcrypto";

create table if not exists public.career_plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid,
  owner_email text,
  title text not null default 'Career readiness plan',
  target_role text not null default 'Software Developer',
  readiness_score integer not null default 0 check (readiness_score >= 0 and readiness_score <= 100),
  placement_level text not null default 'Not scored',
  report jsonb not null default '{}'::jsonb
);

create index if not exists career_plans_created_by_idx on public.career_plans(created_by);
create index if not exists career_plans_created_at_idx on public.career_plans(created_at desc);
create index if not exists career_plans_target_role_idx on public.career_plans(target_role);
