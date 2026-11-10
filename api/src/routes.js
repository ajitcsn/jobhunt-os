import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import { q, one } from './db.js';
import * as S from './store.js';
import { ROLES, SKILLS } from './logic/taxonomy.js';
import { atsScore } from './logic/ats.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const API_URL = (process.env.API_URL || 'http://localhost:8787').replace(/\/$/, '');
export const newToken = () => crypto.randomBytes(24).toString('base64url');

export async function createUser(email, password, name) {
  const hash = await bcrypt.hash(password, 10);
  const u = await one('insert into users (email, password_hash, name, mcp_token) values (lower($1),$2,$3,$4) returning *', [email, hash, name, newToken()]);
  await q('insert into profiles (user_id) values ($1)', [u.id]);
  return u;
}

const sign = (u) => jwt.sign({ uid: u.id }, SECRET, { expiresIn: '30d' });
const pub = (u) => ({ id: u.id, email: u.email, name: u.name, mcp_url: `${API_URL}/mcp/${u.mcp_token}` });

function auth(req, res, next) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    req.uid = jwt.verify(t, SECRET).uid;
    next();
  } catch {
    res.status(401).json({ error: 'Not logged in' });
  }
}

const wrap = (fn) => async (req, res) => {
  try {
    const out = await fn(req, res);
    if (!res.headersSent) out === null || out === undefined ? res.status(404).json({ error: 'Not found' }) : res.json(out);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
};

const r = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

// ----- auth -----
r.post('/auth/signup', wrap(async (req) => {
  const { email, password, name } = req.body;
  if (!email || !password || password.length < 6) throw new Error('Email and a 6+ character password are required');
  if (await one('select id from users where email=lower($1)', [email])) throw new Error('That email is already registered');
  const u = await createUser(email, password, name);
  return { token: sign(u), user: pub(u) };
}));
r.post('/auth/login', wrap(async (req) => {
  const u = await one('select * from users where email=lower($1)', [req.body.email || '']);
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password_hash))) throw new Error('Wrong email or password');
  return { token: sign(u), user: pub(u) };
}));
r.get('/me', auth, wrap(async (req) => pub(await one('select * from users where id=$1', [req.uid]))));
r.post('/me/rotate-mcp', auth, wrap(async (req) => pub(await one('update users set mcp_token=$2 where id=$1 returning *', [req.uid, newToken()]))));

// ----- meta -----
r.get('/meta', (req, res) => res.json({
  roles: Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [k, { label: v.label, skills: Object.keys(v.skills), projects: v.projects }])),
  skills: Object.fromEntries(Object.entries(SKILLS).map(([k, v]) => [k, v.label])),
}));

// ----- overview -----
r.get('/overview', auth, wrap((req) => S.loadAll(req.uid)));
r.post('/today/:key/done', auth, wrap(async (req) => { await S.markToday(req.uid, req.params.key, Number(req.body.snooze_days || 0)); return { ok: true }; }));
r.get('/activity', auth, wrap(async (req) =>
  q('select * from activity_log where user_id=$1 and id>$2 order by id desc limit 50', [req.uid, Number(req.query.since || 0)])));

// ----- profile -----
r.get('/profile', auth, wrap((req) => S.getProfile(req.uid)));
r.put('/profile', auth, wrap((req) => S.updateProfile(req.uid, req.body)));
r.post('/profile/resume-pdf', auth, upload.single('file'), wrap(async (req) => {
  const { default: pdf } = await import('pdf-parse/lib/pdf-parse.js');
  const data = await pdf(req.file.buffer);
  return S.updateProfile(req.uid, { resume_text: data.text.trim() });
}));

// ----- career assets -----
r.get('/resumes', auth, wrap((req) => S.listResumes(req.uid)));
r.post('/resumes', auth, wrap((req) => S.saveResume(req.uid, req.body)));
r.put('/resumes/:id', auth, wrap((req) => S.saveResume(req.uid, { ...req.body, id: Number(req.params.id) })));
r.get('/career-pages', auth, wrap((req) => S.listCareerPages(req.uid)));
r.post('/career-pages', auth, wrap((req) => S.saveCareerPage(req.uid, req.body)));
r.put('/career-pages/:id', auth, wrap((req) => S.saveCareerPage(req.uid, { ...req.body, id: Number(req.params.id) })));
r.get('/templates', auth, wrap((req) => S.listTemplates(req.uid)));
r.post('/templates', auth, wrap((req) => S.saveTemplate(req.uid, req.body)));
r.put('/templates/:id', auth, wrap((req) => S.saveTemplate(req.uid, { ...req.body, id: Number(req.params.id) })));

// ----- companies -----
r.get('/companies', auth, wrap((req) => S.listCompanies(req.uid)));
r.post('/companies', auth, wrap((req) => S.addCompany(req.uid, req.body)));
r.get('/companies/:id', auth, wrap((req) => S.getCompanyFull(req.uid, Number(req.params.id))));
r.put('/companies/:id', auth, wrap((req) => S.updateCompany(req.uid, Number(req.params.id), req.body)));
r.put('/companies/:id/research', auth, wrap((req) => S.saveResearch(req.uid, Number(req.params.id), req.body)));

// ----- contacts / drafts / openings / projects -----
r.post('/contacts', auth, wrap((req) => S.addContact(req.uid, req.body)));
r.put('/contacts/:id', auth, wrap((req) => S.updateContact(req.uid, Number(req.params.id), req.body)));
r.post('/drafts', auth, wrap((req) => S.addDraft(req.uid, req.body)));
r.put('/drafts/:id', auth, wrap((req) => S.updateDraft(req.uid, Number(req.params.id), req.body)));
r.get('/openings', auth, wrap((req) => S.listOpenings(req.uid)));
r.post('/openings', auth, wrap((req) => S.addOpening(req.uid, req.body)));
r.put('/openings/:id', auth, wrap((req) => S.updateOpening(req.uid, Number(req.params.id), req.body)));
r.post('/projects', auth, wrap((req) => S.addProject(req.uid, req.body)));
r.put('/projects/:id', auth, wrap((req) => S.updateProject(req.uid, Number(req.params.id), req.body)));
r.delete('/items/:type/:id', auth, wrap((req) => S.remove(req.uid, req.params.type, Number(req.params.id))));

// Ad-hoc ATS check against any JD
r.post('/ats', auth, wrap(async (req) => {
  const p = await S.getProfile(req.uid);
  return atsScore(req.body.resume_text ?? p?.resume_text ?? '', req.body.jd_text || '');
}));

export default r;
