/**
 * Mock API Server for RecruitIQ
 * Used when PostgreSQL/Redis are not available (no Docker).
 * Serves mock data for testing the frontend UI.
 */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const JWT_SECRET = 'recruitiq-dev-secret-key-change-this-in-production-2024';

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
const upload = multer({ storage: multer.memoryStorage() });

// ─── In-memory data store ─────────────────────────────────────────────
const store = {
  tenants: [],
  users: [],
  jds: [],
  candidates: [],
  scores: [],
  notifications: [],
  batchJobs: [],
};

// Seed a demo user
const demoTenantId = uuidv4();
const demoUserId = uuidv4();
store.tenants.push({ id: demoTenantId, name: "Demo Org", slug: "demo", plan: "free" });
store.users.push({
  id: demoUserId,
  email: 'demo@recruitiq.dev',
  passwordHash: '$2a$12$demo', // not a real hash
  name: 'Demo User',
  role: 'ADMIN',
  tenantId: demoTenantId,
});

// Seed some JDs
const jdIds = [];
const jdTitles = [
  'Senior React Developer',
  'Backend Engineer (Node.js)',
  'Full Stack Developer',
  'DevOps Engineer',
  'Product Manager',
];
jdTitles.forEach((title, i) => {
  const id = uuidv4();
  jdIds.push(id);
  store.jds.push({
    id,
    tenantId: demoTenantId,
    title,
    rawSource: `Job description for ${title}...`,
    parsedRequirements: {
      title,
      required_skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL'].slice(0, 3 + i % 3),
      preferred_skills: ['AWS', 'Docker', 'Kubernetes'],
      years_of_experience: { min: 3, max: 7 },
      education: { level: "Bachelor's", field: 'Computer Science', required: false },
      location: { city: 'Remote', remote: true },
      employment_type: 'Full-time',
      responsibilities: ['Build features', 'Review code', 'Mentor juniors'],
    },
    weightProfile: { skills: 40, experience: 30, education: 15, profile: 15 },
    status: i < 3 ? 'ACTIVE' : 'DRAFT',
    createdById: demoUserId,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { scoreRecords: Math.floor(Math.random() * 30) + 5 },
    createdBy: { name: 'Demo User' },
  });
});

// Seed candidates with scores
const candidateNames = [
  'Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Emma Davis',
  'Frank Miller', 'Grace Wilson', 'Henry Moore', 'Ivy Taylor', 'Jack Anderson',
  'Karen Thomas', 'Leo Jackson', 'Mia White', 'Noah Harris', 'Olivia Martin',
];

candidateNames.forEach((name, i) => {
  const candidateId = uuidv4();
  store.candidates.push({
    id: candidateId,
    tenantId: demoTenantId,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
    parsedData: {
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
      location: ['San Francisco', 'New York', 'Remote', 'Austin', 'Seattle'][i % 5],
      total_experience_years: 2 + i % 8,
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'TypeScript', 'AWS', 'Docker', 'PostgreSQL', 'MongoDB', 'Redis'].slice(0, 4 + i % 5),
      work_experience: [
        { title: 'Software Engineer', company: 'TechCorp', start_date: '2020-01', end_date: '2024-06', responsibilities: ['Built features', 'Led team'] },
        { title: 'Junior Developer', company: 'StartupXYZ', start_date: '2018-03', end_date: '2019-12', responsibilities: ['Developed APIs'] },
      ],
      education: [
        { degree: "Bachelor's", field: 'Computer Science', institution: 'MIT', year: 2018 },
      ],
      certifications: ['AWS Solutions Architect', 'Scrum Master'].slice(0, i % 3),
    },
    tags: [jdIds[0]],
    sourceBatch: null,
    consentEnrichment: false,
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { scoreRecords: 1 },
    scoreRecords: [],
  });

  // Create score for first JD
  const totalScore = Math.floor(Math.random() * 40) + 55;
  const scoreRecord = {
    id: uuidv4(),
    candidateId,
    jdId: jdIds[0],
    totalScore,
    dimensionScores: {
      skills: Math.floor(Math.random() * 30) + 50,
      experience: Math.floor(Math.random() * 30) + 45,
      education: Math.floor(Math.random() * 40) + 40,
      profile: Math.floor(Math.random() * 30) + 50,
    },
    explanation: `${name} shows strong alignment with the role requirements. Key strengths include ${['frontend development', 'system design', 'team collaboration', 'API development'][i % 4]}. Areas for growth include ${['cloud infrastructure', 'testing practices', 'documentation'][i % 3]}.`,
    flags: totalScore > 80 ? ['TOP_CANDIDATE'] : [],
    scoredAt: new Date().toISOString(),
    jd: { id: jdIds[0], title: jdTitles[0] },
    candidate: { id: candidateId, name, email: `${name.toLowerCase().replace(' ', '.')}@example.com`, parsedData: store.candidates[store.candidates.length - 1].parsedData, tags: [] },
  };
  store.scores.push(scoreRecord);
  store.candidates[store.candidates.length - 1].scoreRecords.push(scoreRecord);
});

// ─── Auth middleware ──────────────────────────────────────────────────
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Auth routes ──────────────────────────────────────────────────────
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  const existing = store.users.find(u => u.email === email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const tenantId = uuidv4();
  const userId = uuidv4();
  store.tenants.push({ id: tenantId, name: `${name}'s Org`, slug: email.split('@')[0] });
  const user = { id: userId, email, name, role: 'ADMIN', tenantId };
  store.users.push(user);

  const token = jwt.sign({ id: userId, email, role: 'ADMIN', tenantId }, JWT_SECRET, { expiresIn: '1h' });
  res.cookie('refreshToken', jwt.sign({ id: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' }), { httpOnly: true, sameSite: 'lax', maxAge: 604800000 });
  res.status(201).json({ user: { id: userId, email, name, role: 'ADMIN' }, token, tenant: { id: tenantId, name: `${name}'s Org` } });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email } = req.body;
  let user = store.users.find(u => u.email === email);
  if (!user) {
    // Auto-create for demo
    user = store.users[0]; // Use demo user
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId }, JWT_SECRET, { expiresIn: '1h' });
  res.cookie('refreshToken', jwt.sign({ id: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' }), { httpOnly: true, sameSite: 'lax', maxAge: 604800000 });
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId }, token });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = store.users.find(u => u.id === payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: accessToken });
  } catch { res.status(401).json({ error: 'Invalid refresh token' }); }
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

// ─── JD routes ────────────────────────────────────────────────────────
app.get('/api/v1/jd', auth, (req, res) => {
  const jds = store.jds.filter(j => j.tenantId === req.user.tenantId);
  res.json({ jds, total: jds.length, page: 1, totalPages: 1 });
});

app.get('/api/v1/jd/:id', auth, (req, res) => {
  const jd = store.jds.find(j => j.id === req.params.id);
  if (!jd) return res.status(404).json({ error: 'Not found' });
  res.json(jd);
});

app.post('/api/v1/jd', auth, upload.single('jd'), (req, res) => {
  const jd = {
    id: uuidv4(),
    tenantId: req.user.tenantId,
    title: req.body.title || (req.file ? req.file.originalname.replace(/\.[^.]+$/, '') : 'Untitled Position'),
    rawSource: req.body.rawText || 'Uploaded JD',
    parsedRequirements: {
      title: req.body.title || 'Untitled Position',
      required_skills: ['JavaScript', 'React', 'Node.js'],
      preferred_skills: ['TypeScript', 'AWS'],
      years_of_experience: { min: 2, max: 5 },
      education: { level: "Bachelor's", required: false },
      location: { remote: true },
    },
    weightProfile: { skills: 40, experience: 30, education: 15, profile: 15 },
    status: 'DRAFT',
    createdById: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { scoreRecords: 0 },
    createdBy: { name: 'Demo User' },
  };
  store.jds.push(jd);
  console.log(`[JD] Created: ${jd.title}`);
  res.status(201).json(jd);
});

app.put('/api/v1/jd/:id/weights', auth, (req, res) => {
  const jd = store.jds.find(j => j.id === req.params.id);
  if (!jd) return res.status(404).json({ error: 'Not found' });
  jd.weightProfile = req.body;
  res.json(jd);
});

// ─── Candidate routes ─────────────────────────────────────────────────
app.get('/api/v1/candidates', auth, (req, res) => {
  const candidates = store.candidates.filter(c => c.tenantId === req.user.tenantId);
  res.json({ candidates, total: candidates.length, page: 1, totalPages: 1 });
});

app.get('/api/v1/candidates/:id', auth, (req, res) => {
  const candidate = store.candidates.find(c => c.id === req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Not found' });
  res.json(candidate);
});

app.post('/api/v1/candidates/upload', auth, upload.array('resumes', 500), (req, res) => {
  const fileCount = req.files ? req.files.length : 1;
  const batchId = uuidv4();
  console.log(`[Upload] ${fileCount} file(s) received`);
  res.status(202).json({ batchJobId: batchId, totalFiles: fileCount, candidateIds: [], message: `${fileCount} resumes queued for parsing` });
});

app.get('/api/v1/candidates/batch/:batchId', auth, (req, res) => {
  res.json({ id: req.params.batchId, status: 'DONE', totalCount: 5, doneCount: 5, failedCount: 0 });
});

// ─── Scoring routes ───────────────────────────────────────────────────
app.post('/api/v1/scoring/run', auth, (req, res) => {
  const batchId = uuidv4();
  res.status(202).json({ batchJobId: batchId, candidateCount: 15, message: 'Scoring started for 15 candidates' });
});

app.get('/api/v1/scoring/results/:jdId', auth, (req, res) => {
  const jd = store.jds.find(j => j.id === req.params.jdId);
  const scores = store.scores.filter(s => s.jdId === req.params.jdId);
  scores.sort((a, b) => b.totalScore - a.totalScore);
  res.json({
    jd: jd ? { id: jd.id, title: jd.title, weightProfile: jd.weightProfile, parsedRequirements: jd.parsedRequirements } : null,
    results: scores.map((s, i) => ({
      rank: i + 1,
      candidate: s.candidate,
      totalScore: s.totalScore,
      dimensionScores: s.dimensionScores,
      explanation: s.explanation,
      flags: s.flags,
      scoredAt: s.scoredAt,
    })),
    total: scores.length,
    page: 1,
    totalPages: 1,
    batchStatus: 'DONE',
  });
});

app.post('/api/v1/scoring/rescreen', auth, (req, res) => {
  res.status(202).json({ batchJobId: uuidv4(), totalCount: 15, message: 'Re-screening started' });
});

app.put('/api/v1/scoring/rerank/:jdId', auth, (req, res) => {
  const scores = store.scores.filter(s => s.jdId === req.params.jdId);
  res.json({
    results: scores.map((s, i) => ({
      rank: i + 1,
      candidate: s.candidate,
      totalScore: s.totalScore,
      dimensionScores: s.dimensionScores,
      explanation: s.explanation,
    })),
    weights: req.body,
  });
});

// ─── Export routes ─────────────────────────────────────────────────────
app.get('/api/v1/export/csv/:jdId', auth, (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="shortlist.csv"');
  const header = 'Rank,Name,Email,Score\n';
  const rows = store.scores.filter(s => s.jdId === req.params.jdId)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((s, i) => `${i + 1},${s.candidate.name},${s.candidate.email},${s.totalScore}`).join('\n');
  res.send(header + rows);
});

// ─── Notification routes ──────────────────────────────────────────────
app.get('/api/v1/notifications', auth, (req, res) => {
  res.json({ notifications: store.notifications, total: 0, unreadCount: 0 });
});

app.put('/api/v1/notifications/read-all', auth, (req, res) => {
  res.json({ message: 'All notifications marked as read' });
});

// ─── Data rights (public) ─────────────────────────────────────────────
app.post('/api/v1/data-rights/lookup', (req, res) => {
  res.json({ message: 'If this email exists in our system, a verification code has been sent.' });
});

app.post('/api/v1/data-rights/verify', (req, res) => {
  res.json({ token: 'mock-data-rights-token', expiresIn: 3600 });
});

// ─── Health ───────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', mode: 'mock', timestamp: new Date().toISOString(), version: '1.0.0-dev' });
});

// ─── Global error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Mock Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🧠 RecruitIQ Mock API Server`);
  console.log(`   Mode:   MOCK (no database)`);
  console.log(`   Port:   ${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api/v1`);
  console.log(`   Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`\n   Login with any email/password to test the UI.\n`);
});
