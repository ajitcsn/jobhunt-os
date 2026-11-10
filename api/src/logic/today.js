// The Today engine: plain rules over the user's data → a prioritised action list.
// Every item carries a copy-ready Claude prompt so the user can hand the work to Claude.

const DAY = 86400000;
const toDate = (d) => (d ? new Date(typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d) : null);
const daysBetween = (a, b) => Math.floor((toDate(b) - toDate(a)) / DAY);
export const isoDay = (d = new Date()) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};

export function weekStart(now = new Date()) {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export function buildToday({ profile, companies, contacts, drafts, openings, projects, gaps, done = {}, now = new Date() }) {
  const today = isoDay(now);
  const items = [];
  const add = (it) => {
    if (done[it.key] && done[it.key] >= today) return; // completed / snoozed
    items.push(it);
  };
  const companyName = (id) => companies.find((c) => c.id === id)?.name || 'the company';
  const contactById = Object.fromEntries(contacts.map((c) => [c.id, c]));

  // 1. Onboarding
  if (!profile?.resume_text || !(profile?.target_roles || []).length) {
    add({ key: 'onboarding', track: 'profile', priority: 100, title: 'Finish onboarding: add your resume and target roles', link: '/profile',
      prompt: 'Here is my resume (attached). Read it and update my JobHunt profile: headline, skills, education, and suggest target roles.' });
  }

  // 2. Drafts waiting to be sent
  for (const d of drafts.filter((d) => d.status === 'draft')) {
    const c = contactById[d.contact_id];
    const age = daysBetween(d.created_at, now);
    add({ key: `send-${d.id}`, track: 'outbound', priority: 70 + Math.min(age, 10), title: `Send your ${d.channel} to ${c?.name || 'contact'} (${companyName(c?.company_id)})`,
      detail: age >= 1 ? `Drafted ${age} day${age > 1 ? 's' : ''} ago` : 'Drafted today', link: `/outbound/companies/${c?.company_id}` });
  }

  // 3. Follow-ups due
  for (const d of drafts.filter((d) => d.status === 'sent' && d.follow_up_on && d.follow_up_on <= today && (d.follow_up_count || 0) < 2)) {
    const c = contactById[d.contact_id];
    add({ key: `fu-${d.id}-${d.follow_up_count || 0}`, track: 'outbound', priority: 80, title: `Follow up with ${c?.name || 'contact'} (${companyName(c?.company_id)})`,
      detail: `Sent ${toDate(d.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, no reply yet`, link: `/outbound/companies/${c?.company_id}`,
      prompt: `Using JobHunt, write a short polite follow-up to ${c?.name} at ${companyName(c?.company_id)} and save it as a draft.` });
  }

  // 4. Researched companies with no contacts
  for (const co of companies.filter((c) => c.status !== 'archived')) {
    const n = contacts.filter((c) => c.company_id === co.id).length;
    if (co.has_research && n === 0) {
      add({ key: `contacts-${co.id}`, track: 'outbound', priority: 50 + (4 - (co.priority || 2)) * 5, title: `Find contacts at ${co.name}`, link: `/outbound/companies/${co.id}`,
        prompt: `Using JobHunt, find 3 contacts at ${co.name} (one HR/recruiter, one alumnus of my college, one senior leader in my target function) and add them.` });
    } else if (!co.has_research && co.status === 'shortlisted') {
      add({ key: `research-${co.id}`, track: 'outbound', priority: 40 + (4 - (co.priority || 2)) * 5, title: `Research ${co.name}`, link: `/outbound/companies/${co.id}`,
        prompt: `Using JobHunt, research ${co.name} for my job search and save the research playbook.` });
    }
  }

  // 5. Contacts with no draft
  const drafted = new Set(drafts.map((d) => d.contact_id));
  for (const c of contacts.filter((c) => c.status === 'new' && !drafted.has(c.id))) {
    add({ key: `draft-${c.id}`, track: 'outbound', priority: 55, title: `Draft a message to ${c.name} (${companyName(c.company_id)})`, link: `/outbound/companies/${c.company_id}`,
      prompt: `Using JobHunt, draft a short ${c.email ? 'email' : 'LinkedIn note'} to ${c.name} at ${companyName(c.company_id)} based on my profile and the company research.` });
  }

  // 6–8. Inbound
  for (const o of openings) {
    if (o.stage === 'saved') {
      const left = o.deadline ? daysBetween(today, o.deadline) : null;
      if (left !== null && left < 0) continue;
      if (left === null || left <= 7) {
        add({ key: `apply-${o.id}`, track: 'inbound', priority: left === null ? 45 : 90 - left * 3, title: `Apply: ${o.title} at ${companyName(o.company_id)}`,
          detail: left === null ? 'No deadline listed' : left === 0 ? 'Deadline today' : `Deadline in ${left} day${left > 1 ? 's' : ''}`, link: '/inbound' });
      }
    }
    if (o.stage === 'applied' && o.applied_on && daysBetween(o.applied_on, now) >= 14) {
      add({ key: `ghost-${o.id}`, track: 'inbound', priority: 35, title: `No news on ${o.title} at ${companyName(o.company_id)} for ${daysBetween(o.applied_on, now)} days`,
        detail: 'Nudge a contact there, or mark it ghosted', link: '/inbound' });
    }
    if (o.stage === 'interview') {
      add({ key: `prep-${o.id}`, track: 'inbound', priority: 85, title: `Prep for your ${companyName(o.company_id)} interview`, link: '/inbound',
        prompt: `Using JobHunt, pull my ${companyName(o.company_id)} research and the ${o.title} JD, then build me an interview prep sheet.` });
    }
  }

  // 9. Stalled projects
  for (const p of projects.filter((p) => p.status === 'in_progress')) {
    const idle = daysBetween(p.last_activity_at, now);
    if (idle >= 7) add({ key: `proj-${p.id}`, track: 'projects', priority: 30, title: `Move "${p.title}" forward`, detail: `No update in ${idle} days`, link: '/projects' });
  }

  // 10. Biggest uncovered gap
  const g = gaps?.[0];
  if (g?.top_gaps?.length) {
    const top = g.top_gaps[0];
    const covering = projects.some((p) => (p.skills_covered || []).includes(top.key) && p.status !== 'done');
    if (!covering) {
      add({ key: `gap-${g.role}-${top.key}`, track: 'projects', priority: 40, title: `Close your biggest ${g.label} gap: ${top.label}`,
        detail: (() => { const s = g.suggestions.find((x) => x.covers.includes(top.key)) || g.suggestions[0]; return s ? `Suggested project: ${s.title}` : undefined; })(), link: '/projects' });
    }
  }

  items.sort((a, b) => b.priority - a.priority);

  // Weekly progress
  const ws = weekStart(now);
  const inWeek = (d) => d && toDate(d) >= ws;
  const progress = {
    outreach: { done: drafts.filter((d) => d.status !== 'draft' && inWeek(d.sent_at)).length, target: profile?.weekly_outreach_target || 10 },
    applications: { done: openings.filter((o) => o.applied_on && inWeek(o.applied_on)).length, target: profile?.weekly_applications_target || 5 },
  };
  return { date: today, items, progress };
}
