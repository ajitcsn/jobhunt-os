// One data layer shared by the REST API (web app) and the MCP tools (Claude),
// so a record created either way behaves identically.
import { q, one, log } from './db.js';
import { atsScore } from './logic/ats.js';
import { allGaps } from './logic/gaps.js';
import { buildToday, isoDay } from './logic/today.js';

export const WEB_URL = (process.env.WEB_URL || 'http://localhost:5173').replace(/\/$/, '');

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

async function updateRow(table, userId, id, fields, extraWhere = '') {
  const keys = Object.keys(fields);
  if (!keys.length) return one(`select * from ${table} where id=$1 and user_id=$2`, [id, userId]);
  const sets = keys.map((k, i) => `${k}=$${i + 3}`).join(', ');
  return one(`update ${table} set ${sets}, updated_at=now() where id=$1 and user_id=$2 ${extraWhere} returning *`, [id, userId, ...keys.map((k) => fields[k])]);
}

// ---------- profile ----------
export const PROFILE_FIELDS = ['headline', 'location', 'years_exp', 'education', 'college', 'target_roles', 'target_locations', 'target_company_types',
  'weekly_outreach_target', 'weekly_applications_target', 'resume_text', 'skills', 'links', 'onboarded'];

export async function getProfile(userId) {
  return one('select * from profiles where user_id=$1', [userId]);
}

export async function updateProfile(userId, data, source = 'manual') {
  const f = pick(data, PROFILE_FIELDS);
  if (f.links) f.links = JSON.stringify(f.links);
  const keys = Object.keys(f);
  if (keys.length) {
    const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(', ');
    await q(`update profiles set ${sets}, updated_at=now() where user_id=$1`, [userId, ...keys.map((k) => f[k])]);
  }
  if (f.resume_text !== undefined) await rescoreAll(userId);
  await log(userId, 'profile', userId, 'updated', 'Profile updated', source);
  return getProfile(userId);
}

// ---------- companies ----------
export async function findCompany(userId, ref) {
  if (ref === undefined || ref === null || ref === '') return null;
  if (typeof ref === 'number' || /^\d+$/.test(String(ref))) return one('select * from companies where id=$1 and user_id=$2', [Number(ref), userId]);
  return one('select * from companies where user_id=$1 and lower(name)=lower($2)', [userId, String(ref).trim()]);
}

export async function addCompany(userId, c, source = 'manual') {
  const existing = await findCompany(userId, c.name);
  if (existing) return { ...existing, duplicate: true };
  const row = await one(
    `insert into companies (user_id, name, website, sector, stage, location, fit_reason, priority, status, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
    [userId, c.name.trim(), c.website, c.sector, c.stage, c.location, c.fit_reason, c.priority || 2, c.status || 'shortlisted', source]
  );
  await log(userId, 'company', row.id, 'created', row.name, source);
  return row;
}

export async function ensureCompany(userId, ref, source) {
  if (!ref) return null;
  return (await findCompany(userId, ref)) || (typeof ref === 'string' && !/^\d+$/.test(ref) ? addCompany(userId, { name: ref }, source) : null);
}

export const COMPANY_FIELDS = ['name', 'website', 'sector', 'stage', 'location', 'fit_reason', 'status', 'priority'];
export async function updateCompany(userId, id, data, source = 'manual') {
  const row = await updateRow('companies', userId, id, pick(data, COMPANY_FIELDS));
  if (row) await log(userId, 'company', id, 'updated', row.name, source);
  return row;
}

export async function saveResearch(userId, companyRef, r, source = 'manual') {
  const co = await ensureCompany(userId, companyRef, source);
  if (!co) throw new Error(`Company not found: ${companyRef}`);
  await q(
    `insert into company_research (company_id, summary, why_fit, recent_news, hiring_signals, outreach_angles, sources, source, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8, now())
     on conflict (company_id) do update set summary=coalesce($2, company_research.summary), why_fit=coalesce($3, company_research.why_fit),
       recent_news=coalesce($4, company_research.recent_news), hiring_signals=coalesce($5, company_research.hiring_signals),
       outreach_angles=coalesce($6, company_research.outreach_angles), sources=coalesce($7, company_research.sources), source=$8, updated_at=now()`,
    [co.id, r.summary, r.why_fit, r.recent_news, r.hiring_signals, r.outreach_angles, r.sources ? JSON.stringify(r.sources) : null, source]
  );
  if (co.status === 'shortlisted') await q(`update companies set status='researched', updated_at=now() where id=$1`, [co.id]);
  await log(userId, 'research', co.id, 'saved', co.name, source);
  return co;
}

export async function getCompanyFull(userId, id) {
  const company = await one('select * from companies where id=$1 and user_id=$2', [id, userId]);
  if (!company) return null;
  const research = await one('select * from company_research where company_id=$1', [id]);
  const contacts = await q('select * from contacts where company_id=$1 and user_id=$2 order by id', [id, userId]);
  const drafts = await q('select d.* from drafts d join contacts c on c.id=d.contact_id where c.company_id=$1 and d.user_id=$2 order by d.id', [id, userId]);
  const openings = await q('select * from openings where company_id=$1 and user_id=$2 order by id', [id, userId]);
  return { company, research, contacts, drafts, openings };
}

export async function listCompanies(userId) {
  return q(
    `select c.*, (r.company_id is not null) as has_research,
       (select count(*)::int from contacts x where x.company_id=c.id) as contacts_count,
       (select count(*)::int from drafts d join contacts x on x.id=d.contact_id where x.company_id=c.id and d.status<>'draft') as sent_count,
       (select count(*)::int from openings o where o.company_id=c.id) as openings_count
     from companies c left join company_research r on r.company_id=c.id
     where c.user_id=$1 order by c.priority asc, c.updated_at desc`,
    [userId]
  );
}

// ---------- contacts ----------
export const CONTACT_FIELDS = ['name', 'role_title', 'type', 'linkedin_url', 'email', 'notes', 'status', 'company_id'];
export async function addContact(userId, c, source = 'manual') {
  const co = await ensureCompany(userId, c.company_id ?? c.company, source);
  if (!co) throw new Error('Contact needs a company (id or name).');
  const dup = await one('select * from contacts where user_id=$1 and company_id=$2 and lower(name)=lower($3)', [userId, co.id, c.name]);
  if (dup) return { ...dup, duplicate: true };
  const row = await one(
    `insert into contacts (user_id, company_id, name, role_title, type, linkedin_url, email, notes, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
    [userId, co.id, c.name, c.role_title, c.type || 'other', c.linkedin_url, c.email, c.notes, source]
  );
  await log(userId, 'contact', row.id, 'created', `${row.name} · ${co.name}`, source);
  return row;
}
export async function updateContact(userId, id, data, source = 'manual') {
  const row = await updateRow('contacts', userId, id, pick(data, CONTACT_FIELDS));
  if (row) await log(userId, 'contact', id, 'updated', row.name, source);
  return row;
}

// ---------- drafts ----------
export const DRAFT_FIELDS = ['channel', 'subject', 'body', 'status', 'sent_at', 'follow_up_on', 'follow_up_count'];
export async function addDraft(userId, d, source = 'manual') {
  const contact = await one('select * from contacts where id=$1 and user_id=$2', [d.contact_id, userId]);
  if (!contact) throw new Error(`Contact ${d.contact_id} not found`);
  const row = await one(
    `insert into drafts (user_id, contact_id, channel, subject, body, source) values ($1,$2,$3,$4,$5,$6) returning *`,
    [userId, contact.id, d.channel || (contact.email ? 'email' : 'linkedin'), d.subject, d.body, source]
  );
  if (contact.status === 'new') await q(`update contacts set status='drafted' where id=$1`, [contact.id]);
  await log(userId, 'draft', row.id, 'created', `Draft to ${contact.name}`, source);
  return row;
}

const addDays = (n) => isoDay(new Date(Date.now() + n * 86400000));

export async function updateDraft(userId, id, data, source = 'manual') {
  const f = pick(data, DRAFT_FIELDS);
  const prev = await one('select * from drafts where id=$1 and user_id=$2', [id, userId]);
  if (!prev) return null;
  // Business rules: sending sets a follow-up date; a follow-up bumps the counter.
  if (f.status === 'sent' && prev.status === 'draft') {
    f.sent_at = f.sent_at || isoDay();
    f.follow_up_on = f.follow_up_on || addDays(5);
  }
  if (data.followed_up) {
    f.follow_up_count = (prev.follow_up_count || 0) + 1;
    f.follow_up_on = addDays(5);
  }
  const row = await updateRow('drafts', userId, id, f);
  const cstatus = row.status === 'replied' ? 'replied' : row.status === 'sent' ? 'sent' : null;
  if (cstatus) {
    await q(`update contacts set status=$1, updated_at=now() where id=$2`, [cstatus, row.contact_id]);
    await q(`update companies set status='contacted', updated_at=now() where id=(select company_id from contacts where id=$1) and status in ('shortlisted','researched')`, [row.contact_id]);
  }
  await log(userId, 'draft', id, 'updated', `Draft ${row.status}`, source);
  return row;
}

// ---------- openings ----------
export const OPENING_FIELDS = ['title', 'url', 'location', 'deadline', 'jd_text', 'stage', 'applied_on', 'notes', 'company_id'];
async function scoreOpening(userId, id) {
  const o = await one('select * from openings where id=$1', [id]);
  const p = await getProfile(userId);
  const r = atsScore(p?.resume_text || '', o?.jd_text || '');
  return one(`update openings set ats_score=$2, ats_matched=$3, ats_missing=$4, ats_checks=$5 where id=$1 returning *`,
    [id, r.score, r.matched, r.missing, JSON.stringify(r.checks)]);
}
async function rescoreAll(userId) {
  for (const o of await q('select id from openings where user_id=$1', [userId])) await scoreOpening(userId, o.id);
}

export async function addOpening(userId, o, source = 'manual') {
  const co = await ensureCompany(userId, o.company_id ?? o.company, source);
  if (o.url) {
    const dup = await one('select * from openings where user_id=$1 and url=$2', [userId, o.url]);
    if (dup) return { ...dup, duplicate: true };
  }
  const row = await one(
    `insert into openings (user_id, company_id, title, url, location, deadline, jd_text, stage, applied_on, notes, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
    [userId, co?.id || null, o.title, o.url, o.location, o.deadline || null, o.jd_text || '', o.stage || 'saved', o.applied_on || null, o.notes, source]
  );
  await log(userId, 'opening', row.id, 'created', `${row.title}${co ? ' · ' + co.name : ''}`, source);
  return scoreOpening(userId, row.id);
}
export async function updateOpening(userId, id, data, source = 'manual') {
  const f = pick(data, OPENING_FIELDS);
  if (f.deadline === '') f.deadline = null;
  if (f.applied_on === '') f.applied_on = null;
  if (f.stage === 'applied' && !f.applied_on) {
    const prev = await one('select applied_on from openings where id=$1 and user_id=$2', [id, userId]);
    if (prev && !prev.applied_on) f.applied_on = isoDay();
  }
  const row = await updateRow('openings', userId, id, f);
  if (!row) return null;
  await log(userId, 'opening', id, 'updated', `${row.title} → ${row.stage}`, source);
  return f.jd_text !== undefined ? scoreOpening(userId, id) : row;
}
export async function listOpenings(userId) {
  return q(`select o.*, c.name as company_name from openings o left join companies c on c.id=o.company_id where o.user_id=$1 order by o.deadline nulls last, o.id desc`, [userId]);
}

// ---------- career assets ----------
export async function listResumes(userId) { return q('select * from resumes where user_id=$1 order by is_default desc, updated_at desc', [userId]); }
export async function saveResume(userId, data) {
  if (data.is_default) await q('update resumes set is_default=false where user_id=$1', [userId]);
  const row = data.id
    ? await updateRow('resumes', userId, data.id, pick(data, ['name', 'target_role', 'summary', 'content', 'is_default']))
    : await one('insert into resumes (user_id,name,target_role,summary,content,is_default) values ($1,$2,$3,$4,$5,$6) returning *', [userId, data.name, data.target_role, data.summary, data.content || '', !!data.is_default]);
  await log(userId, 'resume', row.id, data.id ? 'updated' : 'created', row.name);
  return row;
}
export async function listCareerPages(userId) { return q('select cp.*, c.name company_name from career_pages cp left join companies c on c.id=cp.company_id where cp.user_id=$1 order by cp.last_checked_on nulls first, cp.name', [userId]); }
export async function saveCareerPage(userId, data) {
  const co = await ensureCompany(userId, data.company_id ?? data.company, 'manual');
  const fields = { name: data.name, url: data.url, cadence: data.cadence, last_checked_on: data.last_checked_on || null, notes: data.notes, company_id: co?.id || data.company_id || null };
  const row = data.id ? await updateRow('career_pages', userId, data.id, pick(fields, Object.keys(fields)))
    : await one('insert into career_pages (user_id,company_id,name,url,cadence,last_checked_on,notes) values ($1,$2,$3,$4,$5,$6,$7) returning *', [userId, fields.company_id, fields.name, fields.url, fields.cadence || 'weekly', fields.last_checked_on, fields.notes]);
  await log(userId, 'career_page', row.id, data.id ? 'updated' : 'created', row.name);
  return row;
}
export async function listTemplates(userId) { return q('select * from message_templates where user_id=$1 order by channel, contact_type, name', [userId]); }
export async function saveTemplate(userId, data) {
  const row = data.id ? await updateRow('message_templates', userId, data.id, pick(data, ['name', 'channel', 'contact_type', 'subject', 'body']))
    : await one('insert into message_templates (user_id,name,channel,contact_type,subject,body) values ($1,$2,$3,$4,$5,$6) returning *', [userId, data.name, data.channel || 'email', data.contact_type || 'other', data.subject, data.body]);
  await log(userId, 'template', row.id, data.id ? 'updated' : 'created', row.name);
  return row;
}

// ---------- projects ----------
export const PROJECT_FIELDS = ['title', 'target_role', 'skills_covered', 'description', 'status', 'milestones', 'link'];
export async function addProject(userId, p, source = 'manual') {
  const ms = (p.milestones || []).map((m) => (typeof m === 'string' ? { text: m, done: false } : m));
  const row = await one(
    `insert into projects (user_id, title, target_role, skills_covered, description, status, milestones, link, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
    [userId, p.title, p.target_role, p.skills_covered || [], p.description, p.status || 'idea', JSON.stringify(ms), p.link, source]
  );
  await log(userId, 'project', row.id, 'created', row.title, source);
  return row;
}
export async function updateProject(userId, id, data, source = 'manual') {
  const f = pick(data, PROJECT_FIELDS);
  if (f.milestones) f.milestones = JSON.stringify(f.milestones.map((m) => (typeof m === 'string' ? { text: m, done: false } : m)));
  const keys = Object.keys(f);
  const sets = keys.map((k, i) => `${k}=$${i + 3}`).join(', ');
  const row = await one(`update projects set ${sets ? sets + ',' : ''} last_activity_at=now(), updated_at=now() where id=$1 and user_id=$2 returning *`,
    [id, userId, ...keys.map((k) => f[k])]);
  if (row) await log(userId, 'project', id, 'updated', row.title, source);
  return row;
}

// ---------- delete ----------
const TABLES = { company: 'companies', contact: 'contacts', draft: 'drafts', opening: 'openings', project: 'projects', resume: 'resumes', career_page: 'career_pages', template: 'message_templates' };
export async function remove(userId, type, id) {
  const t = TABLES[type];
  if (!t) throw new Error('bad type');
  return one(`delete from ${t} where id=$1 and user_id=$2 returning id`, [id, userId]);
}

// ---------- overview ----------
export async function loadAll(userId) {
  const [profile, companies, contacts, drafts, openings, projects, resumes, careerPages, templates, doneRows] = await Promise.all([
    getProfile(userId),
    listCompanies(userId),
    q('select * from contacts where user_id=$1', [userId]),
    q('select * from drafts where user_id=$1', [userId]),
    listOpenings(userId),
    q('select * from projects where user_id=$1 order by id', [userId]),
    listResumes(userId),
    listCareerPages(userId),
    listTemplates(userId),
    q('select key, until from today_done where user_id=$1', [userId]),
  ]);
  const gaps = allGaps(profile, projects);
  const done = Object.fromEntries(doneRows.map((r) => [r.key, r.until]));
  const today = buildToday({ profile, companies, contacts, drafts, openings, projects, gaps, done });
  return { profile, companies, contacts, drafts, openings, projects, resumes, careerPages, templates, gaps, today };
}

export async function markToday(userId, key, days = 0) {
  // days=0 → done for good (far future); days>0 → snooze
  const until = days ? addDays(days - 1) : '2999-12-31';
  await q(`insert into today_done (user_id, key, until) values ($1,$2,$3) on conflict (user_id,key) do update set until=$3`, [userId, key, until]);
}
