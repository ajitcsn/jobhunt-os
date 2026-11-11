// The default content of the right-hand column when no add/edit panel is open.
import { Link, useLocation } from 'react-router-dom';
import { Cable, ArrowRight } from 'lucide-react';
import { useApp } from './ctx.js';
import { McpPrompt } from './ui.jsx';

function promptsFor(path, data) {
  const co = data.companies[0]?.name || 'Razorpay';
  if (path === '/') return [
    'Using JobHunt, review my command center and help me with the most important action.',
    'Using JobHunt, find 5 Bengaluru fintechs that fit my profile and are hiring, and add them.',
  ];
  if (path.startsWith('/outbound/companies')) return [
    'Using JobHunt, find 5 Bengaluru fintech companies that fit my profile and are hiring, and add them.',
    `Using JobHunt, research ${co} for my job search and save a company intelligence brief with sources.`,
  ];
  if (path.startsWith('/outbound/contacts')) return [
    `Using JobHunt, find 3 contacts at ${co}: one recruiter, one alumnus of my college, one senior leader. Add them and draft outreach for each.`,
  ];
  if (path.startsWith('/outbound/templates')) return [];
  if (path.startsWith('/applications/career-pages')) return [
    `Using JobHunt, check the careers page of ${co} and add any openings that match my profile, with the full job description.`,
  ];
  if (path.startsWith('/applications')) return [
    'Using JobHunt, find 5 current product analyst openings at Bengaluru fintechs and add them with the full job description.',
    'I applied to a role today. Update JobHunt (tell me which one if unsure).',
  ];
  if (path.startsWith('/projects')) return [
    'Using JobHunt, look at my skill gaps and add a project that closes the biggest one, with 4 milestones.',
  ];
  if (path.startsWith('/setup')) return [
    "Here's my resume (attached). Read it and fill in my JobHunt profile: headline, college, skills and the target roles that fit me best.",
  ];
  return [];
}

function Week({ progress }) {
  const rows = [['Outreach sent', progress.outreach], ['Applications', progress.applications]];
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold">This week</h2>
      <div className="mt-3 space-y-3">
        {rows.map(([label, p]) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-slate-500"><span>{label}</span><span className="font-semibold text-slate-800">{p.done} / {p.target}</span></div>
            <div className="h-1.5 bg-slate-100 rounded-full mt-1"><div className="h-1.5 bg-[#0f6b4f] rounded-full" style={{ width: Math.min(100, Math.round((100 * p.done) / (p.target || 1))) + '%' }} /></div>
          </div>
        ))}
      </div>
      <Link to="/" className="text-xs text-[#0f6b4f] font-medium inline-flex items-center gap-1 mt-3">Change targets <ArrowRight size={12} /></Link>
    </section>
  );
}

export default function Rail() {
  const { data } = useApp();
  const { pathname } = useLocation();
  const prompts = promptsFor(pathname, data);
  const next = data.today.items.slice(0, 3);
  const home = pathname === '/';
  return (
    <div className="space-y-4">
      {!home && <Week progress={data.today.progress} />}
      {!!prompts.length && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><Cable size={14} className="text-[#0f6b4f]" aria-hidden="true" />Ask your assistant</h2>
          <p className="text-xs text-slate-500 mt-1 mb-3">Paste into Claude with JobHunt OS switched on. Results land here.</p>
          <div className="space-y-2">{prompts.map((t) => <McpPrompt key={t} text={t} />)}</div>
        </section>
      )}
      {!home && !!next.length && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Next up</h2>
          <ul className="mt-2 space-y-2">
            {next.map((it) => <li key={it.key}><Link to={it.link || '/'} className="text-sm text-slate-700 hover:text-[#0f6b4f] block leading-snug">{it.title}</Link></li>)}
          </ul>
          <Link to="/" className="text-xs text-[#0f6b4f] font-medium inline-flex items-center gap-1 mt-3">All actions <ArrowRight size={12} /></Link>
        </section>
      )}
      <p className="text-[11px] text-slate-400 px-1">Tip: every “Add” and “Edit” button opens its form in this column. Fill it in and it saves straight into the app.</p>
    </div>
  );
}
