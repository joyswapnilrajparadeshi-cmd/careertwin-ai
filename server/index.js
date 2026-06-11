import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: '28mb' }));

const rawAiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
const normalizedAiKey = rawAiKey.trim();
const placeholderKey = !normalizedAiKey || /^(your_|paste_|example_|replace_|sk-your|gsk_your)/i.test(normalizedAiKey) || normalizedAiKey.includes('your_key_here');
const hasKey = Boolean(normalizedAiKey && !placeholderKey);
const aiBaseURL = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || process.env.GROQ_BASE_URL || (normalizedAiKey.startsWith('gsk_') ? 'https://api.groq.com/openai/v1' : undefined);
const aiProvider = process.env.AI_PROVIDER || (String(aiBaseURL || '').includes('groq') || normalizedAiKey.startsWith('gsk_') ? 'Groq' : 'OpenAI-compatible');
const openai = hasKey
  ? new OpenAI({
      apiKey: normalizedAiKey,
      ...(aiBaseURL ? { baseURL: aiBaseURL } : {})
    })
  : null;
const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || (String(aiBaseURL || '').includes('groq') || normalizedAiKey.startsWith('gsk_') ? 'llama-3.1-8b-instant' : 'gpt-4.1-mini');

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '') || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabasePlansTable = process.env.SUPABASE_PLANS_TABLE || 'career_plans';
const databaseEnabled = Boolean(supabaseUrl && supabaseServiceRoleKey && !supabaseServiceRoleKey.includes('your_'));
const supabaseAuthApiKey = supabaseAnonKey || supabaseServiceRoleKey;
const authEnabled = Boolean(databaseEnabled && supabaseAuthApiKey && !supabaseAuthApiKey.includes('your_'));
const validRoles = new Set(['admin', 'mentor', 'student', 'viewer']);
const defaultUserRole = validRoles.has(process.env.DEFAULT_USER_ROLE) ? process.env.DEFAULT_USER_ROLE : 'student';
const allowPublicAdminSignup = process.env.ALLOW_PUBLIC_ADMIN_SIGNUP === 'true';
const publicSignupRoles = new Set(['mentor', 'student', 'viewer']);

function supabaseHeaders(extra = {}) {
  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

function supabaseAuthHeaders(extra = {}, bearer = supabaseAuthApiKey) {
  return {
    apikey: supabaseAuthApiKey,
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

function normalizeRole(role = defaultUserRole) {
  const value = String(role || defaultUserRole).trim().toLowerCase();
  return validRoles.has(value) ? value : defaultUserRole;
}

function normalizeSignupRole(role = defaultUserRole) {
  const normalized = normalizeRole(role);
  if (normalized === 'admin' && !allowPublicAdminSignup) return defaultUserRole === 'admin' ? 'student' : defaultUserRole;
  return publicSignupRoles.has(normalized) || (allowPublicAdminSignup && normalized === 'admin') ? normalized : defaultUserRole;
}

async function supabaseAuthRequest(pathname, options = {}, bearer = supabaseAuthApiKey) {
  if (!authEnabled) {
    const error = new Error('Supabase Auth is not configured. Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and optionally SUPABASE_ANON_KEY to .env.');
    error.status = 503;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/${pathname}`, {
    ...options,
    headers: supabaseAuthHeaders(options.headers || {}, bearer)
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!response.ok) {
    const error = new Error(typeof data === 'string' ? data : data?.msg || data?.message || data?.error_description || 'Supabase Auth request failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function supabaseRequest(pathname, options = {}) {
  if (!databaseEnabled) {
    const error = new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.');
    error.status = 503;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...options,
    headers: supabaseHeaders(options.headers || {})
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!response.ok) {
    const error = new Error(typeof data === 'string' ? data : data?.message || 'Supabase request failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function upsertUserProfile(user, role = defaultUserRole, displayName = '') {
  if (!user?.id) return null;
  const safeRole = normalizeRole(role);
  const profileRow = {
    user_id: user.id,
    email: normalizeEmail(user.email),
    display_name: displayName || user.user_metadata?.display_name || user.email || 'CareerTwin learner',
    role: safeRole
  };

  const rows = await supabaseRequest('profiles?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(profileRow)
  });

  return rows?.[0] || profileRow;
}

async function getUserProfile(userId) {
  if (!userId) return null;
  const rows = await supabaseRequest(`profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`, { method: 'GET' });
  return rows?.[0] || null;
}

function clientAuthResponse(authData, profile) {
  return {
    accessToken: authData?.access_token || null,
    refreshToken: authData?.refresh_token || null,
    expiresAt: authData?.expires_at || null,
    user: authData?.user || null,
    profile: profile || null
  };
}

async function getAuthenticatedUser(req) {
  const authHeader = req.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    const error = new Error('Sign in required.');
    error.status = 401;
    throw error;
  }

  const user = await supabaseAuthRequest('user', { method: 'GET' }, token);
  let profile = await getUserProfile(user.id);
  if (!profile) {
    profile = await upsertUserProfile(user, defaultUserRole, user.email || 'CareerTwin learner');
  }
  return { token, user, profile };
}

function canManagePlan(authContext, row) {
  if (!authContext?.profile) return false;
  if (authContext.profile.role === 'admin' || authContext.profile.role === 'mentor') return true;
  return row?.created_by && row.created_by === authContext.user.id;
}

function errorPayload(error) {
  return {
    ok: false,
    error: error.message || 'Unexpected error',
    details: error.details || undefined
  };
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}


function cleanExtractedResumeText(value = '') {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function stripDataUrlPrefix(value = '') {
  return String(value || '').replace(/^data:[^;]+;base64,/i, '').trim();
}

function fileExtension(fileName = '') {
  const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function extractKnownSkillsFromText(text = '') {
  const lower = String(text || '').toLowerCase();
  const skillRules = [
    ['Python', /\bpython\b|pandas|numpy|flask|django|fastapi/],
    ['Java', /\bjava\b|spring boot|oops|object oriented/],
    ['JavaScript', /javascript|\bjs\b|ecmascript/],
    ['TypeScript', /typescript|\bts\b/],
    ['React', /react|vite|jsx/],
    ['Node.js', /node\.js|nodejs|\bnode\b/],
    ['Express', /express\.js|express api|\bexpress\b/],
    ['REST APIs', /rest api|restful|api integration|http methods/],
    ['SQL', /\bsql\b|mysql|postgres|postgresql|joins|dbms/],
    ['Supabase', /supabase/],
    ['MongoDB', /mongodb|mongo db/],
    ['Git', /\bgit\b|version control/],
    ['GitHub', /github/],
    ['HTML/CSS', /html|css|responsive ui|web design/],
    ['Groq AI APIs', /groq|llm|ai api|prompt engineering/],
    ['Machine Learning', /machine learning|\bml\b|model|classification|prediction/],
    ['Excel', /excel|spreadsheet/],
    ['Power BI', /power bi|dashboarding|dashboards/],
    ['Communication', /communication|presentation|teamwork|collaboration/]
  ];
  return skillRules
    .filter(([, pattern]) => pattern.test(lower))
    .map(([skill]) => skill)
    .slice(0, 14)
    .join(', ');
}

function suggestExperienceLevelFromResume(text = '') {
  const lower = String(text || '').toLowerCase();
  if (/\b(0|1)\+?\s*years?\b|fresher|final[- ]year|student|campus|entry[- ]level/.test(lower)) return 'Fresher / Entry-level';
  if (/intern|internship|trainee/.test(lower)) return 'Internship / trainee';
  const years = lower.match(/(\d+)\+?\s*years?\s*(of)?\s*experience/);
  if (years && Number(years[1]) >= 2) return `${years[1]} years experience`;
  return '';
}

async function extractResumeTextFromBuffer(buffer, fileName = '', mimeType = '') {
  const ext = fileExtension(fileName);
  const type = String(mimeType || '').toLowerCase();

  if (ext === 'txt' || type.includes('text/plain')) {
    return buffer.toString('utf8');
  }

  if (ext === 'pdf' || type.includes('pdf')) {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();

    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }

    return parsed?.text || '';
  } catch (error) {
    const friendly = new Error(`PDF extraction failed. Try exporting the resume as text or DOCX. Details: ${error.message}`);
    friendly.status = 400;
    throw friendly;
  }
}
  if (ext === 'docx' || type.includes('wordprocessingml.document')) {
    try {
      const module = await import('mammoth');
      const mammoth = module.default || module;
      const result = await mammoth.extractRawText({ buffer });
      return result?.value || '';
    } catch (error) {
      const friendly = new Error(`DOCX extraction failed. Try saving the resume again as DOCX or TXT. Details: ${error.message}`);
      friendly.status = 400;
      throw friendly;
    }
  }

  const error = new Error('Unsupported resume format. Upload a PDF, DOCX, or TXT file.');
  error.status = 400;
  throw error;
}

function clampNumber(value, min = 0, max = 100) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function normalizePercent(value, fallback = 50) {
  const num = Number(value);
  if (!Number.isFinite(num)) return clampNumber(fallback);
  // Some models return 8/10-style values for percent fields. Convert them to 80/100.
  if (num > 0 && num <= 10) return clampNumber(num * 10);
  return clampNumber(num);
}

function normalizeSkillLevel(value, fallback = 50) {
  const num = Number(value);
  if (!Number.isFinite(num)) return clampNumber(fallback);
  // Convert compact 0-10 ratings such as 8/9 into 80/90-style dashboard values.
  if (num > 0 && num <= 10) return clampNumber(num * 10);
  return clampNumber(num);
}

function defaultNextActions(input = {}) {
  const targetRole = cleanText(input.targetRole) || 'the target role';
  const weakAreas = cleanText(input.weakAreas) || 'coding, resume, and interview confidence';
  return [
    `Tailor the resume headline and summary for ${targetRole}.`,
    'Add two measurable project bullets with stack, responsibility, outcome, and live/GitHub link.',
    `Create a 7-day practice block for ${weakAreas}.`,
    'Complete one timed coding set daily and record mistakes in a tracker.',
    'Run one technical mock and one HR mock before applying to more roles.'
  ];
}

function polishReportForInput(report = {}, input = {}) {
  const resumeProvided = Boolean(cleanText(input.resumeText));
  const jdProvided = Boolean(cleanText(input.jobDescription));
  const weakActions = /add resume text|add job description|run analysis again/i;
  const hasPlaceholderActions = (report.nextActions || []).some((action) => weakActions.test(action));
  if ((resumeProvided || jdProvided) && hasPlaceholderActions) {
    report.nextActions = defaultNextActions(input);
  }
  if (!report.candidateSnapshot || typeof report.candidateSnapshot !== 'object') report.candidateSnapshot = {};
  report.candidateSnapshot.targetRole = report.candidateSnapshot.targetRole || cleanText(input.targetRole) || 'Software Developer';
  report.candidateSnapshot.experienceLevel = report.candidateSnapshot.experienceLevel || cleanText(input.experienceLevel) || 'Entry-level';
  return report;
}

function arrayOfObjects(value, fallback = []) {
  return Array.isArray(value) ? value.filter(Boolean).map((item) => (typeof item === 'object' && !Array.isArray(item) ? item : { value: String(item) })) : fallback;
}

function arrayOfStrings(value, fallback = []) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : fallback;
}

function safeJsonFromText(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const withoutFence = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(withoutFence); } catch {}
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(withoutFence.slice(start, end + 1)); } catch {}
  }
  return null;
}

function inferKeywords(text = '') {
  const lower = cleanText(text).toLowerCase();
  return {
    hasPython: /python|pandas|numpy|django|flask|fastapi/.test(lower),
    hasJava: /java\b|spring|oops|object oriented/.test(lower),
    hasJs: /javascript|react|node|express|vite|frontend|backend|full stack|full-stack/.test(lower),
    hasSql: /sql|mysql|postgres|database|supabase|mongodb|dbms/.test(lower),
    hasAi: /ai|machine learning|ml|openai|llm|nlp|computer vision|deep learning/.test(lower),
    hasCloud: /aws|azure|gcp|render|vercel|docker|cloud|deployment/.test(lower),
    hasDsa: /dsa|data structure|algorithm|leetcode|coding|problem solving|tcs nqt|nqt/.test(lower),
    hasInternship: /intern|experience|project|built|developed|deployed|github/.test(lower),
    hasCommunication: /presentation|communication|team|lead|collaborat|volunteer|mentor/.test(lower)
  };
}

function computeFallbackReport(input = {}) {
  const resume = cleanText(input.resumeText);
  const jd = cleanText(input.jobDescription);
  const targetRole = cleanText(input.targetRole) || 'Software Developer';
  const experienceLevel = cleanText(input.experienceLevel) || 'Fresher / Entry-level';
  const deadline = cleanText(input.deadline) || '4 weeks';
  const keywords = inferKeywords(`${resume} ${jd} ${targetRole}`);
  const resumeWords = resume ? resume.split(/\s+/).length : 0;
  const jdWords = jd ? jd.split(/\s+/).length : 0;

  const skills = [
    { key: 'Programming foundation', active: keywords.hasPython || keywords.hasJava || keywords.hasJs, target: 80 },
    { key: 'DSA and coding rounds', active: keywords.hasDsa, target: 78 },
    { key: 'Frontend / full-stack delivery', active: keywords.hasJs, target: 74 },
    { key: 'Database and SQL', active: keywords.hasSql, target: 70 },
    { key: 'AI project storytelling', active: keywords.hasAi, target: 72 },
    { key: 'Deployment and cloud basics', active: keywords.hasCloud, target: 66 },
    { key: 'Communication and HR readiness', active: keywords.hasCommunication, target: 76 }
  ];

  const textQuality = Math.min(24, Math.floor(resumeWords / 12));
  const jdSpecificity = Math.min(12, Math.floor(jdWords / 20));
  const matchedSignals = skills.filter((s) => s.active).length;
  const baseScore = 44 + textQuality + jdSpecificity + matchedSignals * 5;
  const readinessScore = clampNumber(baseScore, 35, 92);
  const placementLevel = readinessScore >= 82 ? 'Interview-ready' : readinessScore >= 68 ? 'Strong with targeted practice' : readinessScore >= 52 ? 'Needs focused preparation' : 'Foundation stage';
  const topSignal = skills.find((s) => s.active)?.key || 'Project-based learning potential';
  const weakest = skills.filter((s) => !s.active).slice(0, 2).map((s) => s.key).join(' and ') || 'mock interview precision';

  const skillMatrix = skills.map((skill, index) => {
    const current = clampNumber((skill.active ? 58 : 35) + (resumeWords > 180 ? 10 : 4) + (index % 3) * 4, 25, 88);
    return {
      skill: skill.key,
      currentLevel: current,
      targetLevel: skill.target,
      gap: Math.max(0, skill.target - current),
      action: skill.active
        ? `Convert your ${skill.key.toLowerCase()} signal into measurable resume bullets and interview examples.`
        : `Add one focused mini-project or practice block for ${skill.key.toLowerCase()} before applications.`
    };
  });

  const resumeFindings = [
    {
      area: 'Opening summary',
      status: resumeWords > 80 ? 'Usable' : 'Weak signal',
      evidence: resumeWords > 80 ? 'Resume text has enough content for role positioning.' : 'Resume content is short; recruiters may not see a clear profile story.',
      fix: `Start with a 2-line summary targeting ${targetRole}, including tech stack, project strength, and placement goal.`
    },
    {
      area: 'Project impact',
      status: keywords.hasInternship || keywords.hasJs || keywords.hasAi ? 'Strong opportunity' : 'Needs evidence',
      evidence: keywords.hasInternship || keywords.hasJs || keywords.hasAi ? 'Project or experience keywords are present.' : 'Project outcomes are not visible enough.',
      fix: 'Use action-result bullets: built X, used Y, improved Z, deployed on GitHub/Render, and explain your role clearly.'
    },
    {
      area: 'ATS keywords',
      status: jdWords > 80 ? 'Can be optimized' : 'Missing job context',
      evidence: jdWords > 80 ? 'Job description is available for matching.' : 'No detailed JD was provided, so matching is generic.',
      fix: 'Mirror honest keywords from the JD: language, framework, database, cloud, testing, and problem-solving terms.'
    }
  ];

  const jobMatch = [
    { criteria: 'Technical stack match', matchScore: clampNumber(46 + matchedSignals * 8), notes: `Best signal: ${topSignal}. Add exact stack names from the job description.` },
    { criteria: 'Coding round readiness', matchScore: keywords.hasDsa ? 72 : 48, notes: 'Prepare arrays, strings, recursion, sorting, hashing, SQL, and aptitude under timed conditions.' },
    { criteria: 'Project explanation readiness', matchScore: keywords.hasInternship || keywords.hasAi || keywords.hasJs ? 78 : 54, notes: 'Prepare architecture, challenges, deployment, API flow, database schema, and trade-offs.' },
    { criteria: 'HR and communication readiness', matchScore: keywords.hasCommunication ? 75 : 58, notes: 'Prepare Tell me about yourself, strengths, weakness, conflict, leadership, and relocation answers.' }
  ];

  const codingPlan = [
    { topic: 'Arrays, strings, hashing', priority: 'Critical', practiceSet: '25 timed problems with explanation notes', deadline: 'Week 1' },
    { topic: 'SQL + DBMS basics', priority: 'High', practiceSet: 'Joins, group by, subqueries, normalization, indexing basics', deadline: 'Week 1-2' },
    { topic: 'OOP and language fundamentals', priority: 'High', practiceSet: 'Python/Java/JS interview flashcards and 10 dry runs', deadline: 'Week 2' },
    { topic: 'Aptitude + verbal', priority: 'Medium', practiceSet: 'Daily 35-minute mixed test and mistake log', deadline: 'Week 2-3' },
    { topic: 'Project deep-dive answers', priority: 'Critical', practiceSet: 'Architecture, APIs, auth, deployment, database, future scope', deadline: 'Week 3' }
  ];

  const interviewPlan = [
    {
      round: 'Resume screening',
      focus: 'Make the first 30 seconds role-specific.',
      questionExamples: ['Walk me through your resume.', `Why are you a fit for ${targetRole}?`, 'Which project are you most proud of?'],
      evaluationRubric: 'Clear summary, measurable project evidence, honest skill claims.'
    },
    {
      round: 'Technical interview',
      focus: 'Explain fundamentals before jumping to code.',
      questionExamples: ['Explain time complexity of your solution.', 'Design the API flow of your project.', 'How did you handle errors and deployment?'],
      evaluationRubric: 'Correctness, debugging, trade-off thinking, clean explanation.'
    },
    {
      round: 'HR / managerial',
      focus: 'Show reliability, learning speed, and teamwork.',
      questionExamples: ['Tell me about yourself.', 'Describe a challenge you solved.', 'Why should we hire you?'],
      evaluationRubric: 'Specific stories, confident tone, positive attitude, realistic goals.'
    }
  ];

  const weeklyRoadmap = [
    { week: 'Week 1', goal: 'Fix resume and foundation gaps', tasks: ['Rewrite summary', 'Add project metrics', 'Solve 25 coding problems', 'Create mistake log'], deliverable: 'ATS-friendly resume v1 and coding tracker' },
    { week: 'Week 2', goal: 'Build technical interview stamina', tasks: ['DSA timed sessions', 'SQL practice', 'OOP revision', 'One mock technical interview'], deliverable: 'Technical cheat sheet and solved-problem notebook' },
    { week: 'Week 3', goal: 'Master project storytelling', tasks: ['Prepare project architecture script', 'Record 3-minute project walkthrough', 'Practice API/database questions', 'Update GitHub README'], deliverable: 'Project pitch deck/script and GitHub polish' },
    { week: 'Week 4', goal: 'Application and mock interview sprint', tasks: ['Apply to 25 targeted roles', 'Run 2 HR mocks', 'Run 2 coding mocks', 'Finalize interview answers'], deliverable: 'Placement-ready profile and application pipeline' }
  ];

  const applicationStrategy = [
    { companyType: 'Service-based companies', targetingNote: 'Prioritize aptitude, coding basics, communication, and project clarity.', actions: ['Practice TCS NQT-style questions', 'Prepare relocation/shift answers', 'Keep resume one page'] },
    { companyType: 'Product startups', targetingNote: 'Show deployed projects, ownership, GitHub quality, and problem-solving depth.', actions: ['Add live links', 'Write technical README', 'Prepare system-design-lite explanation'] },
    { companyType: 'Internship / trainee roles', targetingNote: 'Highlight learning speed, availability, and practical project experience.', actions: ['Create tailored cover note', 'Show weekly learning roadmap', 'Mention stack flexibility'] }
  ];

  return normalizeCareerReport({
    mode: openai ? 'local-career-engine-after-ai-error' : 'local-career-engine',
    generatedAt: new Date().toISOString(),
    title: `${targetRole} readiness plan for ${experienceLevel}`,
    overallReadinessScore: readinessScore,
    placementLevel,
    confidence: 0.78,
    executiveSummary: `CareerTwin AI rates this profile as ${placementLevel.toLowerCase()} with a readiness score of ${readinessScore}/100. The strongest current signal is ${topSignal.toLowerCase()}, while the most important improvement area is ${weakest.toLowerCase()}. Focus on resume proof, coding-round practice, project explanation, and targeted applications over the next ${deadline}.`,
    candidateSnapshot: {
      targetRole,
      experienceLevel,
      strongestSignal: topSignal,
      mainGap: weakest,
      readinessBand: placementLevel
    },
    skillMatrix,
    resumeFindings,
    jobMatch,
    codingPlan,
    interviewPlan,
    weeklyRoadmap,
    applicationStrategy,
    elevatorPitch: `I am an entry-level ${targetRole} candidate with hands-on project experience, a strong learning mindset, and practical understanding of building, debugging, and deploying software. I am currently strengthening coding rounds, core fundamentals, and project storytelling to contribute quickly in a real engineering team.`,
    nextActions: [
      'Rewrite the resume summary for the exact target role.',
      'Add 3 project bullets with stack, responsibility, result, and deployment link.',
      'Complete one timed coding set daily and maintain a mistake log.',
      'Prepare a 3-minute explanation for your strongest project.',
      'Run at least two mock interviews before applying heavily.'
    ],
    assumptions: [
      'CareerTwin AI is career guidance and interview preparation support, not a hiring guarantee.',
      'Scores are estimates based on the text entered by the user.',
      'Always keep resume claims truthful and verifiable.'
    ]
  });
}

function normalizeCareerReport(report = {}) {
  const fallback = computeMinimalReport();
  const normalized = {
    mode: report.mode || fallback.mode,
    generatedAt: new Date().toISOString(),
    title: report.title || fallback.title,
    overallReadinessScore: clampNumber(report.overallReadinessScore ?? report.readinessScore ?? fallback.overallReadinessScore, 0, 100),
    placementLevel: report.placementLevel || fallback.placementLevel,
    confidence: Math.max(0, Math.min(1, Number(report.confidence ?? fallback.confidence) || fallback.confidence)),
    executiveSummary: report.executiveSummary || fallback.executiveSummary,
    candidateSnapshot: typeof report.candidateSnapshot === 'object' && report.candidateSnapshot ? report.candidateSnapshot : fallback.candidateSnapshot,
    skillMatrix: arrayOfObjects(report.skillMatrix, fallback.skillMatrix).map((item) => ({
      skill: item.skill || item.name || 'Skill',
      currentLevel: normalizeSkillLevel(item.currentLevel ?? item.current ?? 50),
      targetLevel: normalizeSkillLevel(item.targetLevel ?? item.target ?? 75),
      gap: clampNumber(item.gap ?? Math.max(0, normalizeSkillLevel(item.targetLevel ?? item.target ?? 75) - normalizeSkillLevel(item.currentLevel ?? item.current ?? 50))),
      action: item.action || item.recommendation || 'Practice this skill with measurable weekly targets.'
    })),
    resumeFindings: arrayOfObjects(report.resumeFindings, fallback.resumeFindings).map((item) => ({
      area: item.area || 'Resume area',
      status: item.status || 'Review',
      evidence: item.evidence || item.reason || 'Evidence not specified.',
      fix: item.fix || item.action || 'Rewrite with stronger, measurable detail.'
    })),
    jobMatch: arrayOfObjects(report.jobMatch, fallback.jobMatch).map((item) => ({
      criteria: item.criteria || 'Match criteria',
      matchScore: normalizePercent(item.matchScore ?? item.score ?? 50),
      notes: item.notes || item.reason || 'Match needs further evidence.'
    })),
    codingPlan: arrayOfObjects(report.codingPlan, fallback.codingPlan).map((item) => ({
      topic: item.topic || 'Coding topic',
      priority: item.priority || 'Medium',
      practiceSet: item.practiceSet || item.practice || 'Practice with timed problems.',
      deadline: item.deadline || 'This week'
    })),
    interviewPlan: arrayOfObjects(report.interviewPlan, fallback.interviewPlan).map((item) => ({
      round: item.round || 'Interview round',
      focus: item.focus || 'Prepare clear examples.',
      questionExamples: arrayOfStrings(item.questionExamples || item.questions, ['Tell me about yourself.', 'Explain your project.', 'Why should we hire you?']),
      evaluationRubric: item.evaluationRubric || item.rubric || 'Clarity, correctness, confidence, and honesty.'
    })),
    weeklyRoadmap: arrayOfObjects(report.weeklyRoadmap, fallback.weeklyRoadmap).map((item) => ({
      week: item.week || 'Week',
      goal: item.goal || 'Preparation goal',
      tasks: arrayOfStrings(item.tasks, ['Practice consistently', 'Review mistakes', 'Update resume']),
      deliverable: item.deliverable || 'Visible preparation artifact'
    })),
    applicationStrategy: arrayOfObjects(report.applicationStrategy, fallback.applicationStrategy).map((item) => ({
      companyType: item.companyType || 'Target company type',
      targetingNote: item.targetingNote || item.note || 'Tailor applications to the role.',
      actions: arrayOfStrings(item.actions, ['Customize resume', 'Prepare project explanation', 'Track applications'])
    })),
    elevatorPitch: report.elevatorPitch || fallback.elevatorPitch,
    nextActions: arrayOfStrings(report.nextActions, fallback.nextActions),
    assumptions: arrayOfStrings(report.assumptions, fallback.assumptions)
  };

  return normalized;
}

function computeMinimalReport() {
  return {
    mode: 'local-career-engine-minimal',
    generatedAt: new Date().toISOString(),
    title: 'Placement readiness plan',
    overallReadinessScore: 62,
    placementLevel: 'Needs focused preparation',
    confidence: 0.7,
    executiveSummary: 'CareerTwin AI created a local readiness plan. Add resume text and a target job description for a more specific readiness score.',
    candidateSnapshot: { targetRole: 'Software Developer', experienceLevel: 'Entry-level', strongestSignal: 'Projects', mainGap: 'Specific evidence', readinessBand: 'Needs focused preparation' },
    skillMatrix: [{ skill: 'Programming foundation', currentLevel: 55, targetLevel: 80, gap: 25, action: 'Practice core language concepts and explain projects clearly.' }],
    resumeFindings: [{ area: 'Resume summary', status: 'Needs detail', evidence: 'Limited information was provided.', fix: 'Add role-specific summary and measurable project bullets.' }],
    jobMatch: [{ criteria: 'Role fit', matchScore: 55, notes: 'Add a target job description for stronger matching.' }],
    codingPlan: [{ topic: 'Arrays and strings', priority: 'High', practiceSet: '20 timed problems', deadline: 'Week 1' }],
    interviewPlan: [{ round: 'HR round', focus: 'Confidence and clarity', questionExamples: ['Tell me about yourself.'], evaluationRubric: 'Specific examples and honest answers.' }],
    weeklyRoadmap: [{ week: 'Week 1', goal: 'Resume and coding foundation', tasks: ['Rewrite summary', 'Practice coding'], deliverable: 'Resume v1 and mistake log' }],
    applicationStrategy: [{ companyType: 'Entry-level roles', targetingNote: 'Apply with tailored resume.', actions: ['Customize resume', 'Track applications'] }],
    elevatorPitch: 'I am a motivated entry-level candidate building practical software projects and preparing systematically for technical and HR interviews.',
    nextActions: ['Add resume text', 'Add job description', 'Run analysis again'],
    assumptions: ['Guidance is based on user-provided text.']
  };
}

async function repairJson(text, fallbackFactory) {
  const parsed = safeJsonFromText(text);
  if (parsed) return parsed;
  if (!openai) return fallbackFactory();
  try {
    const repair = await openai.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Repair malformed JSON for a career-readiness app. Return only one valid JSON object. Do not include markdown, code fences, comments, or explanation.' },
        { role: 'user', content: String(text || '').slice(0, 12000) }
      ]
    });
    return safeJsonFromText(repair.choices?.[0]?.message?.content || '') || fallbackFactory();
  } catch {
    return fallbackFactory();
  }
}

async function analyzeCareerReadiness(input = {}) {
  const fallbackFactory = () => computeFallbackReport(input);
  if (!openai) return polishReportForInput(fallbackFactory(), input);

  const prompt = `
You are CareerTwin AI, an interview and placement readiness command center for students and entry-level job seekers.
Analyze the candidate details and return one valid JSON object only.
Do not include markdown, code fences, comments, or explanation.

Candidate input:
- Target role: ${input.targetRole || 'Not specified'}
- Experience level: ${input.experienceLevel || 'Not specified'}
- Placement deadline: ${input.deadline || 'Not specified'}
- Resume text: ${cleanText(input.resumeText).slice(0, 9000) || 'Not provided'}
- Job description: ${cleanText(input.jobDescription).slice(0, 7000) || 'Not provided'}
- Known skills: ${cleanText(input.knownSkills).slice(0, 2000) || 'Not provided'}
- Weak areas: ${cleanText(input.weakAreas).slice(0, 2000) || 'Not provided'}

Required JSON schema:
{
  "mode": "ai-career-analysis",
  "generatedAt": "ISO timestamp",
  "title": "short report title",
  "overallReadinessScore": number from 0 to 100,
  "placementLevel": "short readiness label",
  "confidence": number from 0 to 1,
  "executiveSummary": "specific summary",
  "candidateSnapshot": {
    "targetRole": "...",
    "experienceLevel": "...",
    "strongestSignal": "...",
    "mainGap": "...",
    "readinessBand": "..."
  },
  "skillMatrix": [
    { "skill": "...", "currentLevel": number, "targetLevel": number, "gap": number, "action": "..." }
  ],
  "resumeFindings": [
    { "area": "...", "status": "...", "evidence": "...", "fix": "..." }
  ],
  "jobMatch": [
    { "criteria": "...", "matchScore": number, "notes": "..." }
  ],
  "codingPlan": [
    { "topic": "...", "priority": "Critical/High/Medium/Low", "practiceSet": "...", "deadline": "..." }
  ],
  "interviewPlan": [
    { "round": "...", "focus": "...", "questionExamples": ["..."], "evaluationRubric": "..." }
  ],
  "weeklyRoadmap": [
    { "week": "Week 1", "goal": "...", "tasks": ["..."], "deliverable": "..." }
  ],
  "applicationStrategy": [
    { "companyType": "...", "targetingNote": "...", "actions": ["..."] }
  ],
  "elevatorPitch": "candidate pitch",
  "nextActions": ["..."],
  "assumptions": ["..."]
}

Rules:
- Be truthful and practical. Never guarantee hiring.
- Make advice specific to the text provided.
- Include 5-8 skillMatrix entries, 3-5 resumeFindings, 3-5 jobMatch rows, 4-7 codingPlan rows, 3-5 interviewPlan rows, 4 weeklyRoadmap rows, and 3 applicationStrategy rows.
- All scores must use a 0-100 scale. Do not return 8/9 or 7/10 scales. For example, use 80 and 90, not 8 and 9.
- If resume text and job description are provided, nextActions must not say "Add resume text", "Add job description", or "Run analysis again". Give concrete improvement actions.
- generatedAt should be the current analysis time.
- Assume Indian placement context when the user mentions TCS, NQT, campus, fresher, or service-based companies.
`;

  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a careful career coach and technical interview preparation analyst. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices?.[0]?.message?.content || '';
    const json = await repairJson(content, fallbackFactory);
    return polishReportForInput(normalizeCareerReport({ ...json, mode: json.mode || `${aiProvider.toLowerCase()}-career-analysis` }), input);
  } catch (error) {
    const fallback = fallbackFactory();
    fallback.mode = 'local-career-engine-after-ai-error';
    fallback.assumptions = [...fallback.assumptions, `${aiProvider} AI service was unavailable, so the local readiness engine completed the analysis: ${error.message}`];
    return fallback;
  }
}

function fallbackMockInterview(input = {}) {
  const role = cleanText(input.targetRole) || 'Software Developer';
  const round = cleanText(input.roundType) || 'Technical + HR';
  const focus = cleanText(input.focusArea) || 'projects, coding, fundamentals, and communication';
  const questionBank = [
    { question: `Tell me about yourself for a ${role} role.`, intent: 'Checks clarity, relevance, and confidence.', strongAnswerSignals: ['Role-specific summary', 'Project evidence', 'Learning mindset'], followUp: 'Which part of your profile should we explore first?' },
    { question: 'Explain your strongest project architecture from frontend to backend.', intent: 'Tests project ownership and technical depth.', strongAnswerSignals: ['Clear modules', 'API flow', 'Database/auth/deployment understanding'], followUp: 'What trade-off did you make and why?' },
    { question: 'Solve a coding problem and explain time complexity before writing code.', intent: 'Tests structured problem solving.', strongAnswerSignals: ['Clarifying constraints', 'Brute force to optimized path', 'Complexity reasoning'], followUp: 'How would your solution handle edge cases?' },
    { question: 'Describe one bug or deployment issue you solved.', intent: 'Tests debugging maturity.', strongAnswerSignals: ['Specific problem', 'Steps taken', 'Final fix and learning'], followUp: 'What would you automate next time?' },
    { question: 'Why should we hire you over another fresher?', intent: 'Tests self-awareness and fit.', strongAnswerSignals: ['Practical project skill', 'Reliability', 'Fast learning and teamwork'], followUp: 'What proof can you show in your GitHub or resume?' }
  ];

  return {
    ok: true,
    mode: openai ? 'local-interview-engine-after-ai-error' : 'local-interview-engine',
    generatedAt: new Date().toISOString(),
    title: `${round} mock interview kit for ${role}`,
    warmup: `Start with a 45-second role-specific intro. Keep answers structured with Situation, Action, Result, and Learning. Focus today: ${focus}.`,
    questions: questionBank,
    scoringRubric: [
      { area: 'Technical correctness', weight: 30, excellent: 'Explains approach, edge cases, and complexity clearly.' },
      { area: 'Project ownership', weight: 25, excellent: 'Connects architecture, decisions, errors, and deployment confidently.' },
      { area: 'Communication', weight: 25, excellent: 'Answers are concise, structured, and role-specific.' },
      { area: 'Honesty and learning mindset', weight: 20, excellent: 'Admits limits and explains how they learn quickly.' }
    ],
    practiceInstructions: ['Record yourself once.', 'Rewrite weak answers.', 'Ask a friend to interrupt with follow-ups.', 'Keep answers under 90 seconds unless technical depth is requested.']
  };
}

async function generateMockInterview(input = {}) {
  const fallbackFactory = () => fallbackMockInterview(input);
  if (!openai) return fallbackFactory();

  const prompt = `Return one valid JSON object for a mock interview kit.
Target role: ${input.targetRole || 'Software Developer'}
Round type: ${input.roundType || 'Technical + HR'}
Focus area: ${input.focusArea || 'Projects, coding, fundamentals'}
Candidate context: ${cleanText(input.context).slice(0, 4000) || 'No extra context'}

Schema:
{
  "mode":"ai-mock-interview",
  "generatedAt":"ISO timestamp",
  "title":"...",
  "warmup":"...",
  "questions":[{"question":"...","intent":"...","strongAnswerSignals":["..."],"followUp":"..."}],
  "scoringRubric":[{"area":"...","weight":number,"excellent":"..."}],
  "practiceInstructions":["..."]
}
Include 8-10 questions across resume, coding, project, fundamentals, HR, and scenario-based follow-ups.`;

  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: 0.45,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a practical technical interview coach. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]
    });
    const json = await repairJson(response.choices?.[0]?.message?.content || '', fallbackFactory);
    return { ok: true, ...json };
  } catch (error) {
    const fallback = fallbackFactory();
    fallback.mode = 'local-interview-engine-after-ai-error';
    fallback.practiceInstructions.push(`${aiProvider} AI service was unavailable, so the local interview engine completed the kit: ${error.message}`);
    return fallback;
  }
}


app.post('/api/resume/extract', async (req, res) => {
  try {
    const fileName = cleanText(req.body?.fileName || 'resume');
    const mimeType = cleanText(req.body?.mimeType || '');
    const base64 = stripDataUrlPrefix(req.body?.dataBase64 || '');

    if (!base64) {
      return res.status(400).json({ ok: false, error: 'Upload a resume file first.' });
    }

    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ ok: false, error: 'The uploaded file could not be read.' });
    }
    if (buffer.length > 7 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'Resume file is too large. Upload a file smaller than 7 MB.' });
    }

    const rawText = await extractResumeTextFromBuffer(buffer, fileName, mimeType);
    const resumeText = cleanExtractedResumeText(rawText).slice(0, 18000);
    const wordCount = resumeText ? resumeText.split(/\s+/).filter(Boolean).length : 0;

    if (wordCount < 25) {
      return res.status(400).json({ ok: false, error: 'CareerTwin could not extract enough readable text from this resume. Try a text-based PDF, DOCX, or TXT version.' });
    }

    const suggestedKnownSkills = extractKnownSkillsFromText(resumeText);
    const suggestedExperienceLevel = suggestExperienceLevelFromResume(resumeText);
    const profileHints = {
      hasProjects: /project|built|developed|created|implemented|deployed/i.test(resumeText),
      hasEducation: /education|bachelor|b\.tech|degree|university|college/i.test(resumeText),
      hasLinks: /github|linkedin|portfolio|http/i.test(resumeText),
      hasMetrics: /\d+%|\d+ users?|\d+ projects?|\d+ months?|\d+ weeks?/i.test(resumeText)
    };

    res.json({
      ok: true,
      fileName,
      mimeType,
      resumeText,
      charCount: resumeText.length,
      wordCount,
      suggestedKnownSkills,
      suggestedExperienceLevel,
      profileHints
    });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'CareerTwin AI',
    model,
    openai: hasKey,
    aiConfigured: hasKey,
    aiProvider,
    aiBaseURL: aiBaseURL || null,
    aiMode: hasKey ? `${aiProvider} live` : 'Local career engine',
    databaseEnabled,
    authEnabled,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const report = await analyzeCareerReadiness(req.body || {});
    res.json({ ok: true, ...report });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
});

app.post('/api/mock-interview', async (req, res) => {
  try {
    const kit = await generateMockInterview(req.body || {});
    res.json(kit);
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const displayName = cleanText(req.body?.displayName) || email;
    const role = normalizeSignupRole(req.body?.role);
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required.' });
    }

    const authData = await supabaseAuthRequest('signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        data: { display_name: displayName, role }
      })
    });

    let profile = null;
    if (authData?.user) {
      profile = await upsertUserProfile(authData.user, role, displayName);
    }

    res.json({ ok: true, ...clientAuthResponse(authData, profile) });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required.' });
    }

    const authData = await supabaseAuthRequest('token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    const profile = authData?.user ? await getUserProfile(authData.user.id) : null;
    res.json({ ok: true, ...clientAuthResponse(authData, profile) });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
});
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken || '').trim();

    if (!refreshToken) {
      return res.status(400).json({
        ok: false,
        error: 'Refresh token is required.'
      });
    }

    const authData = await supabaseAuthRequest('token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    });

    const profile = authData?.user ? await getUserProfile(authData.user.id) : null;

    res.json({
      ok: true,
      ...clientAuthResponse(authData, profile)
    });
  } catch (error) {
    res.status(error.status || 401).json(errorPayload(error));
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req);
    res.json({ ok: true, user: authContext.user, profile: authContext.profile });
  } catch (error) {
    res.status(error.status || 401).json(errorPayload(error));
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/plans', async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req);
    const isPrivileged = authContext.profile.role === 'admin' || authContext.profile.role === 'mentor';
    const query = isPrivileged
      ? `${supabasePlansTable}?select=*&order=created_at.desc&limit=80`
      : `${supabasePlansTable}?created_by=eq.${encodeURIComponent(authContext.user.id)}&select=*&order=created_at.desc&limit=80`;
    const rows = await supabaseRequest(query, { method: 'GET' });
    res.json({ ok: true, plans: rows || [] });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
});

app.get('/api/plans/:id', async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req);
    const rows = await supabaseRequest(`${supabasePlansTable}?id=eq.${encodeURIComponent(req.params.id)}&select=*&limit=1`, { method: 'GET' });
    const row = rows?.[0];
    if (!row) return res.status(404).json({ ok: false, error: 'Plan not found.' });
    if (!canManagePlan(authContext, row)) return res.status(403).json({ ok: false, error: 'You cannot access this plan.' });
    res.json({ ok: true, plan: row });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
});

app.post('/api/plans', async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (authContext.profile.role === 'viewer') {
      return res.status(403).json({ ok: false, error: 'Viewers cannot save plans.' });
    }
    const report = req.body?.report || req.body || {};
    const title = cleanText(req.body?.title || report.title || 'Career readiness plan');
    const targetRole = cleanText(req.body?.targetRole || report.candidateSnapshot?.targetRole || 'Software Developer');
    const row = {
      created_by: authContext.user.id,
      owner_email: normalizeEmail(authContext.user.email),
      title,
      target_role: targetRole,
      readiness_score: clampNumber(report.overallReadinessScore || report.readinessScore || 0),
      placement_level: cleanText(report.placementLevel || 'Not scored'),
      report
    };

    const rows = await supabaseRequest(supabasePlansTable, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });

    res.json({ ok: true, plan: rows?.[0] || row });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req);
    const rows = await supabaseRequest(`${supabasePlansTable}?id=eq.${encodeURIComponent(req.params.id)}&select=*&limit=1`, { method: 'GET' });
    const row = rows?.[0];
    if (!row) return res.status(404).json({ ok: false, error: 'Plan not found.' });
    if (!canManagePlan(authContext, row)) return res.status(403).json({ ok: false, error: 'You cannot delete this plan.' });

    await supabaseRequest(`${supabasePlansTable}?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error) res.status(404).send('CareerTwin AI frontend is not built yet. Run the build command before production start.');
  });
});

app.listen(port, () => {
  console.log(`CareerTwin AI server running on port ${port}`);
});
