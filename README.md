# CareerTwin AI

**CareerTwin AI** is an AI Placement & Interview Readiness Platform for students, freshers, mentors, and entry-level job seekers.

It lets users upload a PDF, DOCX, or TXT resume, extracts the resume text, combines it with manually entered target-role details, and generates practical readiness scores, resume fixes, interview questions, coding sprint plans, and export-ready placement reports.

## Features

- Resume upload with PDF, DOCX, and TXT text extraction
- AI placement readiness score from 0-100
- Resume and ATS improvement suggestions
- Job-description match analysis
- Coding-round sprint planner
- Technical + HR mock interview generator
- Weekly preparation roadmap
- Role-based saved career plans with Supabase
- Export-ready print/PDF report
- Groq AI engine with a built-in local readiness engine
- Render-ready production deployment

## Tech stack

- Frontend: React + Vite
- Backend: Express
- Resume parsing: pdf-parse + mammoth
- AI: Groq API through OpenAI-compatible SDK
- Auth/database: Supabase
- Deployment: Render

## Local setup

Enable pnpm and install dependencies:

```bash
corepack enable
corepack prepare pnpm@11.5.2 --activate
pnpm install
```

Create local environment file:

```bash
cp .env.example .env
```

Start the app:

```bash
pnpm run dev
```

Local URLs:

- App: `http://localhost:5174`
- API: `http://localhost:8787`
- Health check: `http://localhost:8787/api/health`

## Environment variables

```env
PORT=8787

GROQ_API_KEY=your_groq_api_key
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.1-8b-instant

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_PLANS_TABLE=career_plans
DEFAULT_USER_ROLE=student
ALLOW_PUBLIC_ADMIN_SIGNUP=false
```

`GROQ_API_KEY` should stay private. Never commit `.env` to GitHub.

The backend also supports `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` for OpenAI-compatible providers, but the recommended configuration for this project is Groq.

## Supabase setup

Supabase is required for sign-in and saved career plans. The core analysis and interview tools continue to work even without Supabase.

To enable Supabase:

1. Create or open a Supabase project.
2. Open SQL Editor.
3. Run `supabase_schema.sql`.
4. Run `supabase_auth_roles_schema.sql`.
5. Add the Supabase URL, anon key, and service role key to `.env` locally or Render environment variables.

## Render deployment

1. Push the project to GitHub.
2. Create a new Web Service on Render.
3. Connect the GitHub repository.
4. Use these settings:

```txt
Build Command: corepack enable && corepack prepare pnpm@11.5.2 --activate && pnpm install && pnpm run build
Start Command: node server/index.js
```

5. Add environment variables from `.env.production.example`.
6. Deploy.

The Express server serves the production frontend build from `dist`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check API, AI engine, and Supabase status |
| POST | `/api/resume/extract` | Extract text and skill hints from uploaded PDF, DOCX, or TXT resume |
| POST | `/api/analyze` | Generate career readiness report |
| POST | `/api/mock-interview` | Generate mock interview kit |
| POST | `/api/auth/signup` | Supabase signup |
| POST | `/api/auth/login` | Supabase login |
| GET | `/api/auth/me` | Current authenticated user |
| GET | `/api/plans` | List saved career plans |
| POST | `/api/plans` | Save a career plan |
| GET | `/api/plans/:id` | Get one saved plan |
| DELETE | `/api/plans/:id` | Delete a saved plan |

## User roles

- `admin`: can review and manage all plans
- `mentor`: can review and manage student plans
- `student`: can create and manage own plans
- `viewer`: can review but cannot save new plans

Public signup supports `student`, `mentor`, and `viewer` by default. Admin signup is blocked unless `ALLOW_PUBLIC_ADMIN_SIGNUP=true`.

## Test flow

1. Open the app.
2. Upload a PDF, DOCX, or TXT resume and wait for extraction to finish.
3. Enter the target role, target job description, deadline, and weak areas manually.
4. Click **Generate readiness plan**.
5. Review readiness score, resume fixes, skill gaps, roadmap, and next actions.
6. Generate a mock interview kit.
7. Use **Export PDF** to print or save the report.
8. Sign in and save the plan to Supabase.

## Important note

CareerTwin AI is a preparation and decision-support tool. It does not guarantee job selection or interview success. Keep resume claims truthful and verifiable.
