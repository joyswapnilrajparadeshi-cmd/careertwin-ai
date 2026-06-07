# CareerTwin AI Auth & Roles

CareerTwin AI supports optional Supabase Auth and role-based saved career plans.

## Roles

| Role | Capabilities |
|---|---|
| `admin` | Can view, load, and delete all plans |
| `mentor` | Can review, load, and delete student plans |
| `student` | Can save, view, load, and delete own plans |
| `viewer` | Can sign in and review, but cannot save plans |

## Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase_schema.sql`.
4. Run `supabase_auth_roles_schema.sql`.
5. Add these variables to `.env` or Render:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_PLANS_TABLE=career_plans
DEFAULT_USER_ROLE=student
ALLOW_PUBLIC_ADMIN_SIGNUP=false
```

## Why service role is used

The Express backend performs trusted server-side operations against Supabase REST and Auth APIs. Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

## Admin users

Public admin signup is blocked by default. To create an admin safely:

1. Sign up normally as a student or mentor.
2. In Supabase SQL Editor, update the role:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

3. Sign out and sign back in.
