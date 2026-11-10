// Seeds the reviewer demo account. Safe to re-run: it wipes and rebuilds only the demo user.
import { pool, migrate, q, one } from './db.js';
import { createUser } from './routes.js';
import * as S from './store.js';
import { isoDay } from './logic/today.js';

const EMAIL = 'demo@jobhunt.app';
const PASSWORD = process.env.DEMO_PASSWORD || 'volopay2026';
const TOKEN = process.env.DEMO_MCP_TOKEN || 'demo-volopay-7Hq2xK9mPz';

const RESUME = `Aarav Mehta
aarav.demo@example.com | +91 98450 00000 | Bengaluru | linkedin.com/in/aarav-demo

EDUCATION
BITS Pilani, K K Birla Goa Campus — B.E. Computer Science, 2024

EXPERIENCE
Risk Analytics Analyst, Global Bank (US consumer cards) — Bengaluru, 2024–2026
- Built SQL and Python pipelines monitoring delinquency across a 4M-account credit card portfolio
- Automated weekly loss-forecasting reports in Excel and Tableau, cutting prep time by 60%
- Ran champion/challenger tests on credit line increase strategy; recommended policy change worth $2.1M annual loss reduction
- Presented portfolio insights to senior risk stakeholders every month

Founder's Office Intern, Early-stage startup — 2023
- Built a pricing and unit-economics model used in a seed fundraise
- Ran 40 customer interviews and wrote the first product requirement doc for onboarding

PROJECTS
- Credit scorecard on Lending Club data (Python, logistic regression, WoE/IV), Gini 0.52
- Personal finance dashboard in Metabase on Postgres

SKILLS
SQL, Python (pandas), Excel, Tableau, statistics, credit risk, financial modelling, stakeholder management

ACHIEVEMENTS
CFA Level II passed. 2nd of 8 teams at a fintech hackathon.`;

const days = (n) => isoDay(new Date(Date.now() + n * 86400000));

async function main() {
  await migrate();
  // Only build the demo once, so reviewers' changes survive server restarts. Pass --reset to rebuild.
  if (!process.argv.includes('--reset') && (await one('select id from users where email=$1', [EMAIL]))) {
    console.log('Demo account exists; skipping seed (use --reset to rebuild).');
    await pool.end();
    return;
  }
  await q('delete from users where email=$1', [EMAIL]);
  const u = await createUser(EMAIL, PASSWORD, 'Aarav (demo)');
  await q('update users set mcp_token=$2 where id=$1', [u.id, TOKEN]);
  const id = u.id;

  await S.updateProfile(id, {
    headline: 'Risk analytics → product analytics', location: 'Bengaluru', years_exp: 2,
    education: 'B.E. Computer Science, 2024', college: 'BITS Pilani Goa',
    target_roles: ['product_analyst', 'credit_risk_analyst'], target_locations: ['Bengaluru'], target_company_types: ['fintech', 'Series A–D startup'],
    weekly_outreach_target: 10, weekly_applications_target: 5, resume_text: RESUME,
    skills: ['SQL', 'Python', 'Tableau', 'credit risk'], onboarded: true,
  });

  const razorpay = await S.addCompany(id, { name: 'Razorpay', website: 'https://razorpay.com', sector: 'Payments', stage: 'Late stage', location: 'Bengaluru', fit_reason: 'Large product analytics team; risk background is relevant to payments fraud and credit lines.', priority: 1 });
  await S.saveResearch(id, razorpay.id, {
    summary: 'Full-stack payments company for Indian businesses: payment gateway, business banking (RazorpayX) and credit for SMEs.',
    why_fit: 'Credit + risk analytics experience maps directly to their lending and risk teams; strong product analytics culture.',
    recent_news: 'Expanding business banking and SME credit offerings.',
    hiring_signals: 'Regular openings for product and business analysts on the careers page.',
    outreach_angles: '1) Card-portfolio risk monitoring → merchant risk. 2) Champion/challenger testing experience → product experiments.',
    sources: ['https://razorpay.com/jobs/'],
  });
  const priya = await S.addContact(id, { company_id: razorpay.id, name: 'Priya S. (sample)', role_title: 'Talent Partner, Product & Analytics', type: 'hr', notes: 'Sample contact for the demo' });
  const d1 = await S.addDraft(id, { contact_id: priya.id, channel: 'email', subject: 'Product analyst roles: risk analytics background',
    body: 'Hi Priya,\n\nI spent two years in risk analytics on a 4M-account card portfolio, where I ran champion/challenger tests that cut losses by $2.1M a year. I\'m moving into product analytics and Razorpay\'s SME credit work is exactly where I\'d like to apply that.\n\nAre you hiring product analysts this quarter? Happy to share my resume.\n\nThanks,\nAarav' });
  await S.updateDraft(id, d1.id, { status: 'sent' });
  await q('update drafts set sent_at=$2, follow_up_on=$3 where id=$1', [d1.id, days(-5), days(0)]); // follow-up due today

  const jupiter = await S.addCompany(id, { name: 'Jupiter', website: 'https://jupiter.money', sector: 'Neobank', stage: 'Series C', location: 'Bengaluru', fit_reason: 'Consumer credit products; needs risk + product analytics.', priority: 2 });
  await S.addCompany(id, { name: 'Slice', sector: 'Consumer credit / bank', location: 'Bengaluru', fit_reason: 'Credit-first consumer fintech.', priority: 2 });

  await S.addOpening(id, { company_id: jupiter.id, title: 'Product Analyst', url: 'https://jupiter.money/careers', location: 'Bengaluru', deadline: days(4),
    jd_text: 'We are looking for a Product Analyst to own funnel and retention metrics for our credit products. You will write SQL daily, build dashboards in Tableau or Metabase, design and analyse A/B tests, and work with product managers on experiments. Strong SQL, Python, statistics and stakeholder communication required. Experience with cohort analysis, activation and retention metrics is a plus. Fintech or credit experience preferred.' });
  await S.addOpening(id, { company_id: razorpay.id, title: 'Business Analyst, Risk', url: 'https://razorpay.com/jobs/', location: 'Bengaluru', stage: 'applied', applied_on: days(-3),
    jd_text: 'Business Analyst in the risk team. Analyse merchant risk and fraud, build SQL monitoring, Python automation and dashboards. Credit risk, underwriting or fraud analytics experience required. Communicate insights to stakeholders.' });

  await S.addProject(id, { title: 'Funnel + cohort teardown of a public app', target_role: 'product_analyst', skills_covered: ['product_metrics', 'sql', 'dashboards'], status: 'in_progress',
    milestones: [{ text: 'Pick an app and define the funnel', done: true }, { text: 'Build dataset in SQL', done: false }, { text: 'Cohort retention chart', done: false }, { text: 'Write a 1-page insight memo', done: false }] });

  console.log(`Seeded ${EMAIL} / ${PASSWORD}  MCP token: ${TOKEN}`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
