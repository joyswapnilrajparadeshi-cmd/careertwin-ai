import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const sampleReport = {
  mode: 'sample-readiness',
  generatedAt: new Date().toISOString(),
  title: 'Software Developer readiness plan for fresher placements',
  overallReadinessScore: 74,
  placementLevel: 'Strong with targeted practice',
  confidence: 0.82,
  executiveSummary:
    'CareerTwin AI identifies a strong project-driven profile that needs sharper coding-round practice, measurable resume bullets, and confident project storytelling before high-volume applications. The best strategy is to polish the resume, run daily timed coding blocks, and prepare a 3-minute explanation of the strongest deployed project.',
  candidateSnapshot: {
    targetRole: 'Software Developer',
    experienceLevel: 'Fresher / Entry-level',
    strongestSignal: 'Full-stack AI project experience',
    mainGap: 'Timed coding consistency and resume metrics',
    readinessBand: 'Strong with targeted practice'
  },
  skillMatrix: [
    { skill: 'Programming foundation', currentLevel: 72, targetLevel: 85, gap: 13, action: 'Revise core Python/JavaScript concepts and explain trade-offs.' },
    { skill: 'DSA and coding rounds', currentLevel: 58, targetLevel: 80, gap: 22, action: 'Solve timed arrays, strings, hashing, recursion, and sorting problems.' },
    { skill: 'Frontend / full-stack delivery', currentLevel: 80, targetLevel: 86, gap: 6, action: 'Prepare architecture explanation for React, Express, APIs, and deployment.' },
    { skill: 'Database and SQL', currentLevel: 63, targetLevel: 78, gap: 15, action: 'Practice joins, group by, indexes, and schema explanation.' },
    { skill: 'AI project storytelling', currentLevel: 82, targetLevel: 88, gap: 6, action: 'Explain AI workflow, guardrails, limitations, and user value.' },
    { skill: 'HR communication', currentLevel: 68, targetLevel: 82, gap: 14, action: 'Prepare STAR stories for teamwork, challenges, and learning speed.' }
  ],
  resumeFindings: [
    { area: 'Summary', status: 'Can be stronger', evidence: 'The profile has project value but needs a clearer opening story.', fix: 'Start with target role, tech stack, deployment, and one impact line.' },
    { area: 'Projects', status: 'Strong', evidence: 'Full-stack AI project experience can differentiate the candidate.', fix: 'Use bullets with problem, stack, responsibility, result, and live link.' },
    { area: 'ATS keywords', status: 'Needs tailoring', evidence: 'Keywords must match each job description.', fix: 'Mirror honest terms such as React, Node, SQL, APIs, deployment, Git, and problem solving.' }
  ],
  jobMatch: [
    { criteria: 'Technical stack match', matchScore: 78, notes: 'React, Express, deployment, and API skills support software developer roles.' },
    { criteria: 'Coding round readiness', matchScore: 61, notes: 'Needs more timed practice and explanation of complexity.' },
    { criteria: 'Project explanation readiness', matchScore: 84, notes: 'Strong if architecture and deployment flow are explained confidently.' },
    { criteria: 'HR readiness', matchScore: 70, notes: 'Prepare concise examples for strengths, failures, teamwork, and why this company.' }
  ],
  codingPlan: [
    { topic: 'Arrays, strings, hashing', priority: 'Critical', practiceSet: '25 timed problems with mistake log', deadline: 'Week 1' },
    { topic: 'SQL basics', priority: 'High', practiceSet: 'Joins, group by, subqueries, normalization', deadline: 'Week 1-2' },
    { topic: 'OOP and language fundamentals', priority: 'High', practiceSet: '30 flashcards + 10 dry-run explanations', deadline: 'Week 2' },
    { topic: 'Project deep dive', priority: 'Critical', practiceSet: 'Architecture, APIs, auth, DB, deployment, future scope', deadline: 'Week 3' }
  ],
  interviewPlan: [
    { round: 'Resume screening', focus: 'Role-specific opening and truthful evidence.', questionExamples: ['Walk me through your resume.', 'Which project is your strongest?'], evaluationRubric: 'Clarity, relevance, metrics, and confidence.' },
    { round: 'Technical', focus: 'Think aloud and explain complexity.', questionExamples: ['Optimize this array problem.', 'Explain your API flow.'], evaluationRubric: 'Correctness, edge cases, complexity, and debugging.' },
    { round: 'HR', focus: 'Show reliability and learning speed.', questionExamples: ['Tell me about yourself.', 'Why should we hire you?'], evaluationRubric: 'Specific examples, calm tone, and positive attitude.' }
  ],
  weeklyRoadmap: [
    { week: 'Week 1', goal: 'Resume and coding foundation', tasks: ['Rewrite summary', 'Add project metrics', 'Solve 25 coding problems'], deliverable: 'Resume v1 and coding mistake log' },
    { week: 'Week 2', goal: 'Technical stamina', tasks: ['Practice SQL', 'Revise OOP', 'Run one technical mock'], deliverable: 'Technical cheat sheet' },
    { week: 'Week 3', goal: 'Project storytelling', tasks: ['Record 3-minute project walkthrough', 'Prepare API/database answers', 'Update GitHub README'], deliverable: 'Project pitch script' },
    { week: 'Week 4', goal: 'Application sprint', tasks: ['Apply to 25 roles', 'Run HR mocks', 'Finalize answer bank'], deliverable: 'Tracked application pipeline' }
  ],
  applicationStrategy: [
    { companyType: 'Service-based companies', targetingNote: 'Prioritize aptitude, basics, communication, and project clarity.', actions: ['Practice TCS NQT-style sets', 'Keep resume one page', 'Prepare relocation answer'] },
    { companyType: 'Product startups', targetingNote: 'Show deployed projects and ownership.', actions: ['Add live links', 'Write technical README', 'Prepare trade-off explanation'] },
    { companyType: 'Internship / trainee roles', targetingNote: 'Highlight learning speed and practical project work.', actions: ['Tailor cover note', 'Show weekly roadmap', 'Mention stack flexibility'] }
  ],
  elevatorPitch:
    'I am an entry-level software developer candidate with hands-on full-stack project experience, deployment practice, and a strong learning mindset. I am strengthening coding rounds and project storytelling to contribute quickly in an engineering team.',
  nextActions: [
    'Rewrite the resume summary for the exact target role.',
    'Add measurable project bullets and live links.',
    'Complete one timed coding set daily.',
    'Prepare a 3-minute strongest-project walkthrough.',
    'Run two mock interviews before applying heavily.'
  ],
  assumptions: ['CareerTwin AI is decision support for preparation, not a hiring guarantee.', 'Scores depend on user-provided text.']
};

const templates = [
  {
    name: 'TCS NQT Sprint',
    badge: 'NQT',
    targetRole: 'TCS Ninja / Digital Software Developer',
    experienceLevel: 'Fresher / Campus placement',
    deadline: '4 weeks',
    knownSkills: 'Python, SQL basics, React project, GitHub, problem solving, communication',
    weakAreas: 'Timed coding, aptitude speed, DBMS revision, explaining projects confidently',
    resumeText:
      'Final-year student with full-stack project experience using React, Express, Groq AI APIs, Supabase, GitHub, and Render deployment. Built AI-powered project dashboards and practiced Python coding for placement rounds.',
    jobDescription:
      'Entry-level software developer role requiring programming fundamentals, problem solving, logical reasoning, SQL basics, communication skills, ability to learn quickly, and project experience.'
  },
  {
    name: 'Full-Stack Developer',
    badge: 'MERN',
    targetRole: 'Junior Full-Stack Developer',
    experienceLevel: 'Entry-level',
    deadline: '6 weeks',
    knownSkills: 'React, Node.js, Express, REST APIs, Supabase, MongoDB basics, deployment, authentication',
    weakAreas: 'System design basics, testing, advanced SQL, performance optimization',
    resumeText:
      'Built full-stack web applications with React frontend, Express backend, Groq AI integration, authentication, database persistence, and PDF reports. Deployed projects through GitHub and Render.',
    jobDescription:
      'We are hiring a junior full-stack developer with React, Node.js, REST APIs, database experience, Git, debugging skills, and ability to build production-ready web applications.'
  },
  {
    name: 'AI App Builder',
    badge: 'AI',
    targetRole: 'AI Application Developer Intern',
    experienceLevel: 'Internship / trainee',
    deadline: '3 weeks',
    knownSkills: 'Groq API, prompt engineering, React, Express, JSON parsing, resilient local logic, dashboard UI',
    weakAreas: 'Model evaluation, production monitoring, vector databases, AI safety explanation',
    resumeText:
      'Developed AI-assisted applications using Groq AI APIs, structured JSON outputs, local readiness engine, frontend dashboards, and backend API orchestration.',
    jobDescription:
      'Internship for AI application developer requiring prompt engineering, API integration, frontend development, backend basics, debugging, and ability to explain AI limitations.'
  },
  {
    name: 'Data Analyst Entry',
    badge: 'Data',
    targetRole: 'Junior Data Analyst',
    experienceLevel: 'Entry-level',
    deadline: '5 weeks',
    knownSkills: 'Python, Excel, SQL, dashboards, data cleaning, communication',
    weakAreas: 'Statistics revision, visualization storytelling, business case interviews',
    resumeText:
      'Student with Python and SQL practice, dashboard projects, data cleaning experience, and interest in using data to support business decisions.',
    jobDescription:
      'Junior data analyst role requiring SQL, Excel, Python basics, dashboarding, communication, data cleaning, and ability to explain insights to non-technical teams.'
  }
];

const agentRoster = [
  { name: 'Resume Signal Agent', detail: 'checks summary, projects, metrics, ATS alignment', status: 'online' },
  { name: 'JD Match Agent', detail: 'compares role keywords, gaps, and proof points', status: 'online' },
  { name: 'Coding Round Agent', detail: 'plans DSA, SQL, aptitude, and timed drills', status: 'online' },
  { name: 'Interview Coach Agent', detail: 'builds technical, HR, and project questions', status: 'online' },
  { name: 'Roadmap Agent', detail: 'turns gaps into weekly preparation deliverables', status: 'online' },
  { name: 'Application Strategy Agent', detail: 'recommends company targeting and follow-ups', status: 'online' }
];

const productFeatures = [
  { title: 'Placement readiness scoring', text: 'Convert resume text, target role, skills, and job descriptions into a practical 0-100 readiness score.' },
  { title: 'Resume upload and ATS intelligence', text: 'Upload PDF, DOCX, or TXT resumes, extract profile text, then find weak summaries, missing metrics, keyword gaps, and project bullets.' },
  { title: 'Mock interview engine', text: 'Generate technical, HR, project, and scenario-based interview questions with strong-answer signals.' },
  { title: 'Coding sprint planner', text: 'Get a weekly coding plan for DSA, SQL, aptitude, OOP, and project deep-dive preparation.' },
  { title: 'Role-based saved plans', text: 'Students save their own plans, mentors can review plans, and admins can manage all records.' },
  { title: 'Export-ready reports', text: 'Print or save a professional placement-readiness report for review, mentors, or your own tracking.' }
];

function authHeaders(session) {
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('careertwin-session') || 'null');
  } catch {
    return null;
  }
}

function storeSession(session) {
  if (session?.accessToken) localStorage.setItem('careertwin-session', JSON.stringify(session));
  else localStorage.removeItem('careertwin-session');
}

function scoreLabel(score) {
  if (score >= 82) return 'Interview-ready';
  if (score >= 68) return 'Strong track';
  if (score >= 52) return 'Focused prep';
  return 'Foundation stage';
}

function levelClass(value = '') {
  const text = String(value).toLowerCase();
  if (text.includes('critical') || text.includes('weak') || text.includes('needs')) return 'danger';
  if (text.includes('high') || text.includes('strong') || text.includes('ready')) return 'success';
  if (text.includes('medium') || text.includes('review')) return 'warning';
  return 'info';
}

function App() {
  const [session, setSession] = useState(getStoredSession());
  const [health, setHealth] = useState(null);
  const [report, setReport] = useState(sampleReport);
  const [form, setForm] = useState(templates[0]);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');
  const [plans, setPlans] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [interviewKit, setInterviewKit] = useState(null);
  const [resumeUpload, setResumeUpload] = useState(null);
  const [interviewForm, setInterviewForm] = useState({ targetRole: templates[0].targetRole, roundType: 'Technical + HR', focusArea: 'resume, coding, projects, and communication', context: templates[0].resumeText });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  useEffect(() => {
    storeSession(session);
    if (session?.accessToken) loadPlans(session);
  }, [session]);

  const profile = session?.profile;
  const isSavedEnabled = Boolean(session?.accessToken && profile?.role !== 'viewer');

  function applyTemplate(template, index) {
    setActiveTemplate(index);
    setForm(template);
    setInterviewForm((current) => ({
      ...current,
      targetRole: template.targetRole,
      context: template.resumeText,
      focusArea: template.weakAreas
    }));
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(new Error('Could not read the selected file.'));
      reader.readAsDataURL(file);
    });
  }

  async function handleResumeUpload(file) {
    if (!file) return;
    const allowed = /\.(pdf|docx|txt)$/i.test(file.name);
    if (!allowed) {
      setNotice('Upload a PDF, DOCX, or TXT resume file.');
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      setNotice('Resume file is too large. Upload a file smaller than 7 MB.');
      return;
    }

    setBusyAction('extractResume');
    setResumeUpload({ fileName: file.name, status: 'Extracting resume text...' });
    setNotice('Extracting resume text from uploaded file...');
    try {
      const dataBase64 = await readFileAsBase64(file);
      const response = await fetch('/api/resume/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataBase64 })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Resume extraction failed.');

      setActiveTemplate(-1);
      setForm((current) => {
        const updated = {
          ...current,
          resumeText: data.resumeText,
          knownSkills: data.suggestedKnownSkills || current.knownSkills,
          experienceLevel: data.suggestedExperienceLevel || current.experienceLevel
        };
        setInterviewForm((prev) => ({
          ...prev,
          targetRole: updated.targetRole,
          focusArea: updated.weakAreas || prev.focusArea,
          context: data.resumeText
        }));
        return updated;
      });
      setResumeUpload({ fileName: file.name, status: `Extracted ${data.wordCount || 0} words. Review the fields below before analysis.` });
      setNotice('Resume extracted successfully. Enter the target role, job description, deadline, and weak areas, then generate the readiness plan.');
    } catch (error) {
      setResumeUpload({ fileName: file.name, status: error.message });
      setNotice(error.message);
    } finally {
      setBusyAction('');
    }
  }

  async function loadPlans(currentSession = session) {
    if (!currentSession?.accessToken) return;
    setBusyAction('refreshPlans');
    setNotice('Refreshing saved plans...');
    try {
      const response = await fetch('/api/plans', { headers: authHeaders(currentSession) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Could not load saved plans.');
      setPlans(data.plans || []);
      setNotice((data.plans || []).length ? 'Saved plans refreshed.' : 'No saved plans yet. Generate and save a report first.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusyAction('');
    }
  }

  async function runAnalysis(event) {
    event?.preventDefault?.();
    setLoading(true);
    setNotice('Analyzing resume and job description...');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Analysis failed.');
      setReport(data);
      setNotice(data.mode?.includes('local') ? 'Generated with the built-in CareerTwin readiness engine.' : `${health?.aiProvider || 'AI'} readiness analysis generated successfully.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateInterview(event) {
    event?.preventDefault?.();
    setBusyAction('mockInterview');
    setNotice('Generating mock interview kit...');
    try {
      const response = await fetch('/api/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interviewForm)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Mock interview generation failed.');
      setInterviewKit(data);
      setNotice(data.mode?.includes('local') ? 'Mock interview kit generated with the built-in interview engine.' : `${health?.aiProvider || 'AI'} mock interview kit generated successfully.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusyAction('');
    }
  }

  async function savePlan() {
    if (!isSavedEnabled) {
      setNotice('Sign in as student, mentor, or admin to save plans.');
      return;
    }
    setBusyAction('savePlan');
    setNotice('Saving plan to your archive...');
    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ report, title: report.title, targetRole: report.candidateSnapshot?.targetRole })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Could not save plan.');
      setPlans((current) => [data.plan, ...current]);
      setNotice('Plan saved successfully. It is now available in Career plans archive.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusyAction('');
    }
  }

  async function deletePlan(id) {
    setBusyAction(`delete:${id}`);
    setNotice('Deleting saved plan...');
    try {
      const response = await fetch(`/api/plans/${id}`, { method: 'DELETE', headers: authHeaders(session) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Could not delete plan.');
      setPlans((current) => current.filter((plan) => plan.id !== id));
      setNotice('Saved plan deleted.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusyAction('');
    }
  }

  function loadPlan(plan) {
    if (plan?.report) {
      setReport(plan.report);
      setNotice('Saved plan loaded into the command center.');
    }
  }

  function exportReport() {
    const win = window.open('', '_blank');
    if (!win) {
      setNotice('Popup blocked. Allow popups to export the report.');
      return;
    }
    win.document.write(reportHtml(report));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  return (
    <main>
      <div className="noise" />
      <div className="mesh mesh-a" />
      <div className="mesh mesh-b" />
      <Topbar session={session} setSession={setSession} health={health} />
      <Hero report={report} runAnalysis={runAnalysis} loading={loading} health={health} />
      <FeatureStrip />
      <Dashboard
        report={report}
        form={form}
        setForm={setForm}
        runAnalysis={runAnalysis}
        loading={loading}
        templates={templates}
        activeTemplate={activeTemplate}
        applyTemplate={applyTemplate}
        notice={notice}
        savePlan={savePlan}
        exportReport={exportReport}
        isSavedEnabled={isSavedEnabled}
        busyAction={busyAction}
        resumeUpload={resumeUpload}
        handleResumeUpload={handleResumeUpload}
      />
      <InterviewLab interviewForm={interviewForm} setInterviewForm={setInterviewForm} interviewKit={interviewKit} generateInterview={generateInterview} busyAction={busyAction} />
      <SavedPlans plans={plans} session={session} loadPlan={loadPlan} deletePlan={deletePlan} reload={() => loadPlans(session)} busyAction={busyAction} />
      <Architecture health={health} />
      <Footer />
    </main>
  );
}

function Topbar({ session, setSession, health }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CareerTwin AI home">
          <span className="brand-orb">CT</span>
          <span>
            <strong>CareerTwin AI</strong>
            <small>Placement Readiness Command Center</small>
          </span>
        </a>
        <nav>
          <a href="#analyze">Analyze</a>
          <a href="#interview">Interview</a>
          <a href="#plans">Plans</a>
          <a href="#status">Status</a>
        </nav>
        <div className="top-actions">
          <span className={`status-dot ${health?.aiConfigured || health?.openai ? 'success' : 'warning'}`}>{health?.aiConfigured || health?.openai ? `${health?.aiProvider || 'AI'} live` : 'Local engine'}</span>
          {session?.profile ? (
            <button className="ghost" onClick={() => setSession(null)}>{session.profile.role} logout</button>
          ) : (
            <button className="primary small" onClick={() => setOpen(true)}>Sign in</button>
          )}
        </div>
      </header>
      {open && <AuthModal setOpen={setOpen} setSession={setSession} />}
    </>
  );
}

function AuthModal({ setOpen, setSession }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'student' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Authentication failed.');
      setSession(data);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="auth-card glass-card">
        <button className="close" onClick={() => setOpen(false)}>×</button>
        <p className="eyebrow">Supabase Auth</p>
        <h2>{mode === 'login' ? 'Sign in to save career plans' : 'Create a CareerTwin account'}</h2>
        <p className="muted">Auth is optional. The app still runs without Supabase, while saving plans requires configuration.</p>
        <form onSubmit={submit} className="stack-form">
          {mode === 'signup' && (
            <label>
              Display name
              <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Joy Swapnil" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 characters" />
          </label>
          {mode === 'signup' && (
            <label>
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
          )}
          {error && <div className="alert danger">{error}</div>}
          <button className="primary" disabled={busy}><ActionLabel active={busy} busy="Please wait..." idle={mode === 'login' ? 'Sign in' : 'Create account'} /></button>
        </form>
        <button className="link-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

function Hero({ report, runAnalysis, loading, health }) {
  return (
    <section id="top" className="hero section-pad">
      <div className="hero-copy">
        <p className="eyebrow">AI placement intelligence</p>
        <h1>Turn your resume into a deployable interview-readiness command center.</h1>
        <p className="hero-text">
          CareerTwin AI analyzes your resume, target role, job description, skills, and weak areas to generate a readiness score, coding sprint, mock interview plan, ATS fixes, and export-ready placement report.
        </p>
        <div className="hero-actions">
          <button className="primary" onClick={runAnalysis} disabled={loading}><ActionLabel active={loading} busy="Analyzing..." idle="Run readiness analysis" /></button>
          <a className="secondary" href="#analyze">Open dashboard</a>
        </div>
        <div className="mini-metrics">
          <Metric label="AI Engine" value={health?.aiConfigured || health?.openai ? `${health?.aiProvider || 'AI'} Live` : 'Local'} />
          <Metric label="Database" value={health?.databaseEnabled ? 'Supabase' : 'Optional'} />
          <Metric label="Export" value="Print/PDF" />
        </div>
      </div>
      <div className="hero-panel glass-card">
        <div className="panel-topline">
          <span>Live readiness twin</span>
          <span>{new Date(report.generatedAt).toLocaleDateString()}</span>
        </div>
        <ScoreRing score={report.overallReadinessScore} label={report.placementLevel} />
        <h3>{report.title}</h3>
        <p>{report.executiveSummary}</p>
        <div className="agent-grid compact">
          {agentRoster.slice(0, 4).map((agent) => (
            <div className="agent-pill" key={agent.name}>
              <span />
              <strong>{agent.name}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureStrip() {
  return (
    <section className="feature-strip section-pad">
      {productFeatures.map((feature) => (
        <article className="feature-card glass-card" key={feature.title}>
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>
        </article>
      ))}
    </section>
  );
}

function Dashboard({ report, form, setForm, runAnalysis, loading, templates, activeTemplate, applyTemplate, notice, savePlan, exportReport, isSavedEnabled, busyAction, resumeUpload, handleResumeUpload }) {
  return (
    <section id="analyze" className="dashboard section-pad">
      <div className="section-heading">
        <p className="eyebrow">Command center</p>
        <h2>Analyze placement readiness</h2>
        <p>Upload a resume first, then manually enter the target role, job description, deadline, and weak areas. CareerTwin uses Groq AI when configured and includes a built-in local readiness engine for continuous analysis.</p>
      </div>
      <div className="dashboard-grid">
        <div className="glass-card input-console">
          <div className="template-row">
            {templates.map((template, index) => (
              <button className={activeTemplate === index ? 'template active' : 'template'} key={template.name} onClick={() => applyTemplate(template, index)}>
                <span>{template.badge}</span>{template.name}
              </button>
            ))}
          </div>
          <form onSubmit={runAnalysis} className="analysis-form">
            <div className="resume-upload-card">
              <div>
                <p className="eyebrow">Resume upload</p>
                <h3>Upload resume</h3>
                <p>Upload PDF, DOCX, or TXT. CareerTwin extracts resume text automatically, then you can edit the extracted content below.</p>
                {resumeUpload && <small>{resumeUpload.fileName} · {resumeUpload.status}</small>}
              </div>
              <label className="upload-drop">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  disabled={busyAction === 'extractResume'}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    handleResumeUpload(file);
                    event.target.value = '';
                  }}
                />
                <span><ActionLabel active={busyAction === 'extractResume'} busy="Extracting..." idle="Choose resume" /></span>
                <small>PDF · DOCX · TXT</small>
              </label>
            </div>
            <div className="manual-entry-note">
              <strong>Manual details to add:</strong> target role, job description, preparation deadline, and weak areas. Known skills and resume text can be auto-filled from the uploaded resume.
            </div>
            <div className="two-col">
              <label>Target role<input value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })} /></label>
              <label>Experience level<input value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })} /></label>
            </div>
            <div className="two-col">
              <label>Preparation deadline<input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
              <label>Known skills <span className="field-hint">auto-filled or edit manually</span><input value={form.knownSkills} onChange={(e) => setForm({ ...form, knownSkills: e.target.value })} /></label>
            </div>
            <label>Extracted resume text <span className="field-hint">editable after upload</span><textarea rows="7" value={form.resumeText} onChange={(e) => setForm({ ...form, resumeText: e.target.value })} /></label>
            <label>Target job description<textarea rows="6" value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} /></label>
            <label>Weak areas / concerns<textarea rows="4" value={form.weakAreas} onChange={(e) => setForm({ ...form, weakAreas: e.target.value })} /></label>
            <div className="form-actions">
              <button className="primary" disabled={loading || busyAction === 'extractResume'}><ActionLabel active={loading} busy="Generating plan..." idle="Generate readiness plan" /></button>
              <button className="secondary" type="button" onClick={savePlan} disabled={!isSavedEnabled || busyAction === 'savePlan'}><ActionLabel active={busyAction === 'savePlan'} busy="Saving..." idle="Save plan" /></button>
              <button className="ghost" type="button" onClick={exportReport}>Export PDF</button>
            </div>
            {notice && <div className={`alert ${notice.toLowerCase().includes('error') || notice.toLowerCase().includes('failed') ? 'danger' : 'info'}`}>{notice}</div>}
          </form>
        </div>
        <ReportView report={report} />
      </div>
    </section>
  );
}

function ReportView({ report }) {
  const skills = report.skillMatrix || [];
  return (
    <div className="report-column">
      <div className="glass-card report-hero">
        <div>
          <p className="eyebrow">Readiness score</p>
          <h2>{report.overallReadinessScore}/100</h2>
          <p>{scoreLabel(report.overallReadinessScore)} · Confidence {Math.round((report.confidence || 0) * 100)}%</p>
        </div>
        <ScoreRing score={report.overallReadinessScore} small />
      </div>
      <div className="glass-card snapshot-card">
        <h3>Candidate snapshot</h3>
        <div className="snapshot-grid">
          {Object.entries(report.candidateSnapshot || {}).map(([key, value]) => (
            <div key={key}>
              <span>{key.replace(/[A-Z]/g, (m) => ` ${m}`).trim()}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card">
        <h3>Skill gap matrix</h3>
        <div className="skill-list">
          {skills.map((item) => (
            <div className="skill-row" key={item.skill}>
              <div className="skill-head">
                <strong>{item.skill}</strong>
                <span>{item.currentLevel}/{item.targetLevel}</span>
              </div>
              <div className="bar"><span style={{ width: `${Math.min(100, item.currentLevel)}%` }} /></div>
              <p>{item.action}</p>
            </div>
          ))}
        </div>
      </div>
      <InfoGrid title="Resume fixes" items={report.resumeFindings || []} fields={['status', 'evidence', 'fix']} />
      <InfoGrid title="Job match" items={report.jobMatch || []} labelField="criteria" fields={['matchScore', 'notes']} />
      <Roadmap report={report} />
    </div>
  );
}

function InfoGrid({ title, items, labelField = 'area', fields }) {
  return (
    <div className="glass-card">
      <h3>{title}</h3>
      <div className="info-list">
        {items.map((item, index) => (
          <article className="info-item" key={`${title}-${index}`}>
            <div className="info-head">
              <strong>{item[labelField]}</strong>
              {item.status && <span className={`chip ${levelClass(item.status)}`}>{item.status}</span>}
              {item.matchScore !== undefined && <span className="chip success">{item.matchScore}% match</span>}
            </div>
            {fields.map((field) => field !== 'status' && field !== 'matchScore' && <p key={field}>{item[field]}</p>)}
          </article>
        ))}
      </div>
    </div>
  );
}

function Roadmap({ report }) {
  return (
    <div className="glass-card roadmap-card">
      <h3>Weekly placement roadmap</h3>
      <div className="timeline">
        {(report.weeklyRoadmap || []).map((week) => (
          <article key={week.week}>
            <span>{week.week}</span>
            <h4>{week.goal}</h4>
            <ul>{(week.tasks || []).map((task) => <li key={task}>{task}</li>)}</ul>
            <strong>{week.deliverable}</strong>
          </article>
        ))}
      </div>
      <h3>Next actions</h3>
      <ul className="check-list">{(report.nextActions || []).map((action) => <li key={action}>{action}</li>)}</ul>
      <div className="pitch-box">
        <span>Elevator pitch</span>
        <p>{report.elevatorPitch}</p>
      </div>
    </div>
  );
}

function InterviewLab({ interviewForm, setInterviewForm, interviewKit, generateInterview, busyAction }) {
  return (
    <section id="interview" className="section-pad interview-section">
      <div className="section-heading">
        <p className="eyebrow">Mock interview lab</p>
        <h2>Generate question sets and strong-answer signals</h2>
        <p>Create a focused interview kit for technical rounds, HR, project discussions, service-based companies, startups, or internships.</p>
      </div>
      <div className="dashboard-grid narrow">
        <form className="glass-card analysis-form" onSubmit={generateInterview}>
          <label>Target role<input value={interviewForm.targetRole} onChange={(e) => setInterviewForm({ ...interviewForm, targetRole: e.target.value })} /></label>
          <div className="two-col">
            <label>Round type<input value={interviewForm.roundType} onChange={(e) => setInterviewForm({ ...interviewForm, roundType: e.target.value })} /></label>
            <label>Focus area<input value={interviewForm.focusArea} onChange={(e) => setInterviewForm({ ...interviewForm, focusArea: e.target.value })} /></label>
          </div>
          <label>Candidate context<textarea rows="7" value={interviewForm.context} onChange={(e) => setInterviewForm({ ...interviewForm, context: e.target.value })} /></label>
          <button className="primary" disabled={busyAction === 'mockInterview'}><ActionLabel active={busyAction === 'mockInterview'} busy="Generating kit..." idle="Generate mock interview kit" /></button>
        </form>
        <div className="glass-card interview-output">
          {interviewKit ? (
            <>
              <p className="eyebrow">{interviewKit.mode}</p>
              <h3>{interviewKit.title}</h3>
              <p>{interviewKit.warmup}</p>
              <div className="question-list">
                {(interviewKit.questions || []).map((item, index) => (
                  <article key={`${item.question}-${index}`}>
                    <span>Q{index + 1}</span>
                    <h4>{item.question}</h4>
                    <p><strong>Intent:</strong> {item.intent}</p>
                    <p><strong>Follow-up:</strong> {item.followUp}</p>
                    <ul>{(item.strongAnswerSignals || []).map((signal) => <li key={signal}>{signal}</li>)}</ul>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No mock interview yet" text="Generate a kit to see questions, follow-ups, and scoring rubrics here." />
          )}
        </div>
      </div>
    </section>
  );
}

function SavedPlans({ plans, session, loadPlan, deletePlan, reload, busyAction }) {
  return (
    <section id="plans" className="section-pad saved-section">
      <div className="section-heading row-heading">
        <div>
          <p className="eyebrow">Saved intelligence</p>
          <h2>Career plans archive</h2>
          <p>Supabase-backed plans are available after login. Mentors and admins can review multiple student records.</p>
        </div>
        <button className="secondary" onClick={reload} disabled={!session?.accessToken || busyAction === 'refreshPlans'}><ActionLabel active={busyAction === 'refreshPlans'} busy="Refreshing..." idle="Refresh" /></button>
      </div>
      {!session?.accessToken ? (
        <EmptyState title="Sign in to use saved plans" text="Configure Supabase and sign in to persist readiness reports." />
      ) : plans.length ? (
        <div className="plan-grid">
          {plans.map((plan) => (
            <article className="glass-card plan-card" key={plan.id || plan.created_at}>
              <span className="chip info">{plan.placement_level || 'Plan'}</span>
              <h3>{plan.title}</h3>
              <p>{plan.target_role}</p>
              <strong>{plan.readiness_score || 0}/100</strong>
              <div className="card-actions">
                <button className="secondary" onClick={() => loadPlan(plan)}>Load</button>
                <button className="ghost danger-text" onClick={() => deletePlan(plan.id)} disabled={busyAction === `delete:${plan.id}`}><ActionLabel active={busyAction === `delete:${plan.id}`} busy="Deleting..." idle="Delete" /></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No saved plans yet" text="Generate a readiness report and save it from the dashboard." />
      )}
    </section>
  );
}

function Architecture({ health }) {
  return (
    <section id="status" className="section-pad architecture">
      <div className="section-heading">
        <p className="eyebrow">Platform status</p>
        <h2>Career intelligence workspace</h2>
        <p>A focused placement-readiness platform with AI analysis, interview preparation, saved plans, and export-ready reports.</p>
      </div>
      <div className="agent-grid">
        {agentRoster.map((agent) => (
          <article className="glass-card agent-card" key={agent.name}>
            <span className="pulse" />
            <h3>{agent.name}</h3>
            <p>{agent.detail}</p>
            <small>{agent.status}</small>
          </article>
        ))}
      </div>
      <div className="deploy-card glass-card">
        <div>
          <h3>Live services</h3>
          <p>AI Engine: <strong>{health?.aiConfigured || health?.openai ? `${health?.aiProvider || 'AI'} connected` : 'Local readiness engine'}</strong></p>
          <p>Saved plans: <strong>{health?.databaseEnabled ? 'Supabase connected' : 'Not connected'}</strong></p>
        </div>
        <div>
          <h3>Workspace readiness</h3>
          <p>Reports, interviews, saved plans, and PDF export are available from the dashboard.</p>
        </div>
      </div>
    </section>
  );
}

function ActionLabel({ active, busy, idle }) {
  return (
    <span className="action-label">
      {active && <span className="mini-spinner" aria-hidden="true" />}
      <span>{active ? busy : idle}</span>
    </span>
  );
}

function ScoreRing({ score = 0, label = '', small = false }) {
  const style = { '--score': `${Math.max(0, Math.min(100, score)) * 3.6}deg` };
  return (
    <div className={small ? 'score-ring small' : 'score-ring'} style={style}>
      <div>
        <strong>{score}</strong>
        {!small && <span>{label}</span>}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state glass-card">
      <span>◇</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <strong>CareerTwin AI</strong>
      <span>AI placement and interview readiness platform</span>
    </footer>
  );
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function rows(items = [], renderer) {
  return items.map(renderer).join('');
}

function reportHtml(report) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
<style>
body{font-family:Inter,Arial,sans-serif;margin:40px;color:#111827;line-height:1.5}h1{font-size:30px;margin-bottom:6px}h2{margin-top:26px;border-bottom:1px solid #e5e7eb;padding-bottom:8px}.score{font-size:42px;font-weight:900;color:#4338ca}.card{border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin:14px 0;background:#f8fafc}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.chip{display:inline-block;padding:4px 10px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:700}li{margin:5px 0}@media print{body{margin:20px}.card{break-inside:avoid}}</style>
</head><body>
<p class="chip">CareerTwin AI Report</p>
<h1>${escapeHtml(report.title)}</h1>
<div class="score">${escapeHtml(report.overallReadinessScore)}/100</div>
<p><strong>${escapeHtml(report.placementLevel)}</strong> · Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</p>
<p>${escapeHtml(report.executiveSummary)}</p>
<h2>Candidate snapshot</h2>
<div class="grid">${rows(Object.entries(report.candidateSnapshot || {}), ([key, value]) => `<div class="card"><strong>${escapeHtml(key)}</strong><br>${escapeHtml(value)}</div>`)}</div>
<h2>Skill matrix</h2>
${rows(report.skillMatrix || [], (item) => `<div class="card"><strong>${escapeHtml(item.skill)}</strong> · ${escapeHtml(item.currentLevel)}/${escapeHtml(item.targetLevel)}<p>${escapeHtml(item.action)}</p></div>`)}
<h2>Resume findings</h2>
${rows(report.resumeFindings || [], (item) => `<div class="card"><strong>${escapeHtml(item.area)} — ${escapeHtml(item.status)}</strong><p>${escapeHtml(item.evidence)}</p><p><b>Fix:</b> ${escapeHtml(item.fix)}</p></div>`)}
<h2>Coding plan</h2>
${rows(report.codingPlan || [], (item) => `<div class="card"><strong>${escapeHtml(item.topic)}</strong> · ${escapeHtml(item.priority)} · ${escapeHtml(item.deadline)}<p>${escapeHtml(item.practiceSet)}</p></div>`)}
<h2>Interview plan</h2>
${rows(report.interviewPlan || [], (item) => `<div class="card"><strong>${escapeHtml(item.round)}</strong><p>${escapeHtml(item.focus)}</p><ul>${rows(item.questionExamples || [], (q) => `<li>${escapeHtml(q)}</li>`)}</ul><p>${escapeHtml(item.evaluationRubric)}</p></div>`)}
<h2>Weekly roadmap</h2>
${rows(report.weeklyRoadmap || [], (item) => `<div class="card"><strong>${escapeHtml(item.week)}: ${escapeHtml(item.goal)}</strong><ul>${rows(item.tasks || [], (task) => `<li>${escapeHtml(task)}</li>`)}</ul><p><b>Deliverable:</b> ${escapeHtml(item.deliverable)}</p></div>`)}
<h2>Elevator pitch</h2><p>${escapeHtml(report.elevatorPitch)}</p>
<h2>Next actions</h2><ul>${rows(report.nextActions || [], (item) => `<li>${escapeHtml(item)}</li>`)}</ul>
<p><small>${escapeHtml((report.assumptions || []).join(' · '))}</small></p>
</body></html>`;
}

createRoot(document.getElementById('root')).render(<App />);
