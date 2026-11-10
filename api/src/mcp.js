// MCP server: the plug between the user's own Claude and JobHunt.
// Claude does the research and writing; these tools only store and organise.
// The playbook for each step lives in the tool descriptions.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { one, q } from './db.js';
import * as S from './store.js';
import { ROLES, SKILLS } from './logic/taxonomy.js';

const W = S.WEB_URL;
const ok = (summary, data) => ({ content: [{ type: 'text', text: summary + (data ? '\n\n' + JSON.stringify(data, null, 1) : '') }] });
const fail = (msg) => ({ content: [{ type: 'text', text: 'Error: ' + msg }], isError: true });
const guard = (fn) => async (args) => {
  try { return await fn(args); } catch (e) { return fail(e.message); }
};

const ROLE_KEYS = Object.keys(ROLES);
const SKILL_KEYS = Object.keys(SKILLS);

function buildServer(userId) {
  const server = new McpServer(
    { name: 'jobhunt-os', version: '1.0.0' },
    { instructions: `JobHunt OS stores and tracks the user's job search: Companies (research → contacts → outreach drafts), Applications (openings + applications with an ATS score), and Career assets (skill-gap projects). Always call get_context first. You do the web research and writing; save results with the tools. After saving, give the user the app links returned. Never invent facts, emails or URLs.` }
  );

  server.registerTool('get_context', {
    title: 'Get job-search context',
    description: 'ALWAYS call this first. Returns the user\'s profile (resume, target roles, college), skill gaps computed by the app, weekly targets, today\'s to-do list, and the companies/contacts already tracked (so you avoid duplicates and can reference IDs).',
    inputSchema: {},
  }, guard(async () => {
    const d = await S.loadAll(userId);
    const p = d.profile || {};
    return ok(`Context loaded. App: ${W}`, {
      profile: { headline: p.headline, location: p.location, years_exp: p.years_exp, college: p.college, education: p.education,
        target_roles: p.target_roles, target_locations: p.target_locations, target_company_types: p.target_company_types,
        skills: p.skills, resume_text: (p.resume_text || '').slice(0, 6000) || '(no resume yet — ask the user to attach one, then call update_profile)' },
      gaps: d.gaps.map((g) => ({ role: g.label, readiness_pct: g.readiness, top_gaps: g.top_gaps.map((s) => s.label) })),
      today: d.today.items.slice(0, 10).map((i) => i.title),
      weekly_progress: d.today.progress,
      companies: d.companies.map((c) => ({ id: c.id, name: c.name, status: c.status, researched: c.has_research, contacts: c.contacts_count })),
      contacts: d.contacts.map((c) => ({ id: c.id, company_id: c.company_id, name: c.name, type: c.type, status: c.status })),
      openings: d.openings.map((o) => ({ id: o.id, title: o.title, company: o.company_name, stage: o.stage, ats: o.ats_score })),
      projects: d.projects.map((x) => ({ id: x.id, title: x.title, status: x.status })),
      valid_role_keys: ROLE_KEYS, valid_skill_keys: SKILL_KEYS,
    });
  }));

  server.registerTool('update_profile', {
    title: 'Update profile',
    description: 'Save the user\'s profile. Use after the user attaches/pastes their resume: pass the full resume as plain text in resume_text, plus extracted skills, headline, education, college. target_roles must use valid role keys: ' + ROLE_KEYS.join(', ') + '. Only include fields you know.',
    inputSchema: {
      headline: z.string().optional(), location: z.string().optional(), years_exp: z.number().optional(),
      education: z.string().optional(), college: z.string().optional().describe('College/university name, used to find alumni'),
      target_roles: z.array(z.enum(ROLE_KEYS)).optional(), target_locations: z.array(z.string()).optional(),
      target_company_types: z.array(z.string()).optional().describe('e.g. fintech, early-stage startup, bank'),
      weekly_outreach_target: z.number().int().optional(), weekly_applications_target: z.number().int().optional(),
      resume_text: z.string().optional(), skills: z.array(z.string()).optional(),
    },
  }, guard(async (a) => {
    await S.updateProfile(userId, { ...a, onboarded: true }, 'claude');
    return ok(`Profile saved. Skill gaps and ATS scores were recalculated. View: ${W}/profile`);
  }));

  server.registerTool('add_companies', {
    title: 'Add target companies',
    description: 'Add companies to the user\'s Companies list. PLAYBOOK (find companies): read get_context for target roles, locations and company types; use web search to find companies that match AND show hiring signals (recent funding, careers page openings, team growth). For each, give a one-line fit_reason tied to the user\'s profile. priority 1 = best fit, 3 = stretch. Duplicates by name are skipped.',
    inputSchema: {
      companies: z.array(z.object({
        name: z.string(), website: z.string().optional(), sector: z.string().optional(), stage: z.string().optional().describe('e.g. Seed, Series B, Public'),
        location: z.string().optional(), fit_reason: z.string().optional(), priority: z.number().int().min(1).max(3).optional(),
      })).min(1),
    },
  }, guard(async ({ companies }) => {
    const out = [];
    for (const c of companies) {
      const row = await S.addCompany(userId, c, 'claude');
      out.push({ id: row.id, name: row.name, skipped_duplicate: !!row.duplicate, link: `${W}/outbound/companies/${row.id}` });
    }
    return ok(`Added ${out.filter((o) => !o.skipped_duplicate).length} companies. Open: ${W}/outbound`, out);
  }));

  server.registerTool('save_company_research', {
    title: 'Save company research playbook',
    description: 'Save a research playbook for one company (by id or exact name; created if new). PLAYBOOK (research): use web search for what the company does, business model, recent news (last 6 months), funding, hiring signals (open roles, team growth), and 2–3 outreach angles that connect the user\'s real resume to the company\'s current priorities. Keep each field short and scannable. Always include source URLs.',
    inputSchema: {
      company: z.union([z.number(), z.string()]).describe('Company id or name'),
      summary: z.string().describe('What they do, model, stage — 2-4 sentences'),
      why_fit: z.string().optional().describe('Why this company fits the user'),
      recent_news: z.string().optional(), hiring_signals: z.string().optional(),
      outreach_angles: z.string().optional().describe('2-3 specific hooks for outreach'),
      sources: z.array(z.string()).optional(),
    },
  }, guard(async ({ company, ...r }) => {
    const co = await S.saveResearch(userId, company, r, 'claude');
    return ok(`Research saved for ${co.name}: ${W}/outbound/companies/${co.id}`, { company_id: co.id });
  }));

  server.registerTool('add_contacts', {
    title: 'Add contacts at a company',
    description: 'Add people to reach out to. PLAYBOOK (find contacts): use web search (LinkedIn public profiles, company team pages, news, talks) to find a mix of: type "hr" (recruiter / talent partner), type "alumni" (went to the user\'s college — see profile.college), type "leader" (head/director/VP of the user\'s target function or a founder). Public professional info only. Include linkedin_url when found. Only include email if publicly listed — NEVER guess emails. Put how you found them in notes.',
    inputSchema: {
      contacts: z.array(z.object({
        company: z.union([z.number(), z.string()]).describe('Company id or name'),
        name: z.string(), role_title: z.string().optional(), type: z.enum(['hr', 'alumni', 'leader', 'other']),
        linkedin_url: z.string().optional(), email: z.string().optional(), notes: z.string().optional(),
      })).min(1),
    },
  }, guard(async ({ contacts }) => {
    const out = [];
    for (const c of contacts) {
      const row = await S.addContact(userId, c, 'claude');
      out.push({ id: row.id, name: row.name, company_id: row.company_id, skipped_duplicate: !!row.duplicate });
    }
    return ok(`Added ${out.filter((o) => !o.skipped_duplicate).length} contacts. Open: ${W}/outbound/companies/${out[0]?.company_id}`, out);
  }));

  server.registerTool('create_drafts', {
    title: 'Create outreach drafts',
    description: 'Save outreach message drafts for contacts (by contact id — get ids from get_context or add_contacts). The user reviews, edits and sends them from the app. PLAYBOOK (write outreach): email ≤120 words, LinkedIn note ≤300 characters. One specific hook from the company research, one relevant proof point from the user\'s REAL resume (never invent), one small clear ask (15-min chat / referral / advice). Tone by type: hr → role fit + ask about openings; alumni → shared college, warm and casual; leader → insight about their business, very short. Subject lines short and specific.',
    inputSchema: {
      drafts: z.array(z.object({
        contact_id: z.number().int(), channel: z.enum(['email', 'linkedin']).optional(),
        subject: z.string().optional(), body: z.string(),
      })).min(1),
    },
  }, guard(async ({ drafts }) => {
    const out = [];
    for (const d of drafts) {
      const row = await S.addDraft(userId, d, 'claude');
      const c = await one('select company_id from contacts where id=$1', [row.contact_id]);
      out.push({ id: row.id, contact_id: row.contact_id, link: `${W}/outbound/companies/${c.company_id}` });
    }
    return ok(`Saved ${out.length} drafts. Review, edit and send them here: ${out[0]?.link}`, out);
  }));

  server.registerTool('add_openings', {
    title: 'Add job openings / programmes',
    description: 'Add open roles, internships, fellowships or programmes to the Applications board. PLAYBOOK (find openings): use web search on company careers pages, job boards and programme pages that match the user\'s target roles and locations. Always include the source url, and paste the job description text into jd_text (the app computes an ATS match score from it locally). Include deadline (YYYY-MM-DD) if stated. Use stage "applied" with applied_on if the user says they already applied.',
    inputSchema: {
      openings: z.array(z.object({
        company: z.union([z.number(), z.string()]), title: z.string(), url: z.string().optional(), location: z.string().optional(),
        deadline: z.string().optional().describe('YYYY-MM-DD'), jd_text: z.string().optional(),
        stage: z.enum(['saved', 'applied', 'interview', 'offer', 'rejected', 'ghosted']).optional(), applied_on: z.string().optional(), notes: z.string().optional(),
      })).min(1),
    },
  }, guard(async ({ openings }) => {
    const out = [];
    for (const o of openings) {
      const row = await S.addOpening(userId, o, 'claude');
      out.push({ id: row.id, title: row.title, ats_score: row.ats_score, missing_keywords: (row.ats_missing || []).slice(0, 6), skipped_duplicate: !!row.duplicate });
    }
    return ok(`Added ${out.length} openings with ATS scores. Board: ${W}/applications`, out);
  }));

  server.registerTool('update_status', {
    title: 'Update a record\'s status',
    description: 'Change status of an existing record when the user tells you something happened (e.g. "I applied to X", "Priya replied", "I finished the dashboard project"). Allowed: company: shortlisted|researched|contacted|archived; contact: new|drafted|sent|replied|closed; draft: draft|sent|replied; opening: saved|applied|interview|offer|rejected|ghosted; project: idea|in_progress|done.',
    inputSchema: {
      type: z.enum(['company', 'contact', 'draft', 'opening', 'project']), id: z.number().int(), status: z.string(),
      note: z.string().optional(),
    },
  }, guard(async ({ type, id, status, note }) => {
    let row;
    if (type === 'company') row = await S.updateCompany(userId, id, { status }, 'claude');
    if (type === 'contact') row = await S.updateContact(userId, id, { status, ...(note ? { notes: note } : {}) }, 'claude');
    if (type === 'draft') row = await S.updateDraft(userId, id, { status }, 'claude');
    if (type === 'opening') row = await S.updateOpening(userId, id, { stage: status, ...(note ? { notes: note } : {}) }, 'claude');
    if (type === 'project') row = await S.updateProject(userId, id, { status }, 'claude');
    if (!row) return fail(`${type} ${id} not found`);
    return ok(`Updated ${type} ${id} → ${status}. ${W}`);
  }));

  server.registerTool('add_project', {
    title: 'Add a portfolio project',
    description: 'Add a job-search project to the Projects tracker. Use the gaps from get_context: pick a project that closes the biggest gaps for the user\'s target role. skills_covered must use skill keys: ' + SKILL_KEYS.join(', ') + '. Give 3–5 concrete milestones.',
    inputSchema: {
      title: z.string(), target_role: z.enum(ROLE_KEYS).optional(), skills_covered: z.array(z.enum(SKILL_KEYS)).optional(),
      description: z.string().optional(), milestones: z.array(z.string()).optional(), status: z.enum(['idea', 'in_progress', 'done']).optional(),
    },
  }, guard(async (a) => {
    const row = await S.addProject(userId, a, 'claude');
    return ok(`Project added: ${W}/projects`, { id: row.id });
  }));

  server.registerTool('search_items', {
    title: 'Search tracked items',
    description: 'Find tracked records by text to get their ids and details (e.g. a company\'s saved research, a contact\'s draft, an opening\'s JD).',
    inputSchema: { type: z.enum(['company', 'contact', 'draft', 'opening', 'project']), text: z.string().optional() },
  }, guard(async ({ type, text = '' }) => {
    const like = `%${text}%`;
    const sql = {
      company: `select c.*, r.summary, r.why_fit, r.outreach_angles from companies c left join company_research r on r.company_id=c.id where c.user_id=$1 and c.name ilike $2`,
      contact: `select x.*, c.name company from contacts x join companies c on c.id=x.company_id where x.user_id=$1 and (x.name ilike $2 or c.name ilike $2)`,
      draft: `select d.*, x.name contact_name from drafts d join contacts x on x.id=d.contact_id where d.user_id=$1 and (x.name ilike $2 or d.body ilike $2)`,
      opening: `select o.*, c.name company from openings o left join companies c on c.id=o.company_id where o.user_id=$1 and (o.title ilike $2 or c.name ilike $2)`,
      project: `select * from projects where user_id=$1 and title ilike $2`,
    }[type];
    const rows = await q(sql + ' limit 20', [userId, like]);
    return ok(`${rows.length} ${type}(s) found`, rows);
  }));

  // Ready-made prompts (show up in Claude's prompt menu where supported)
  const prompt = (name, description, args, text) => server.registerPrompt(name, { description, argsSchema: args }, (a) => ({
    messages: [{ role: 'user', content: { type: 'text', text: text(a) } }],
  }));
  prompt('find_companies', 'Find target companies for my search', { focus: z.string().optional() },
    ({ focus }) => `Use JobHunt: call get_context, then web-search for 8 companies that fit my target roles${focus ? ` with focus: ${focus}` : ''} and are hiring. Add them with add_companies.`);
  prompt('research_company', 'Research one company', { company: z.string() },
    ({ company }) => `Use JobHunt: call get_context, research ${company} on the web and save it with save_company_research.`);
  prompt('outreach_pack', 'Contacts + drafts for a company', { company: z.string() },
    ({ company }) => `Use JobHunt: for ${company}, find one HR, one alumni and one leader contact (add_contacts), then write a tailored draft for each (create_drafts).`);
  prompt('find_openings', 'Find open roles and programmes', { focus: z.string().optional() },
    ({ focus }) => `Use JobHunt: call get_context, then find 5 current openings or programmes matching my target roles${focus ? ` (${focus})` : ''}. Add them with add_openings including JD text.`);

  return server;
}

export function mountMcp(app) {
  const handle = async (req, res) => {
    const user = await one('select id from users where mcp_token=$1', [req.params.token]);
    if (!user) return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Invalid JobHunt MCP link. Copy a fresh one from Settings.' }, id: null });
    const server = buildServer(user.id);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { transport.close(); server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error('MCP error', e);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
    }
  };
  app.post('/mcp/:token', handle);
  const notAllowed = (req, res) => res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null });
  app.get('/mcp/:token', notAllowed);
  app.delete('/mcp/:token', notAllowed);
}
