import { Link } from 'react-router-dom';
import { Check, Clock, Send, Inbox, FolderKanban, User, PartyPopper } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import { PageHead, CopyButton, Empty } from '../ui.jsx';

const TRACK = {
  outbound: { icon: Send, label: 'Outbound', c: 'text-sky-600 bg-sky-50' },
  inbound: { icon: Inbox, label: 'Inbound', c: 'text-emerald-600 bg-emerald-50' },
  projects: { icon: FolderKanban, label: 'Projects', c: 'text-amber-600 bg-amber-50' },
  profile: { icon: User, label: 'Profile', c: 'text-indigo-600 bg-indigo-50' },
};

function Bar({ label, done, target }) {
  const pct = Math.min(100, Math.round((100 * done) / (target || 1)));
  return (
    <div className="card p-4 flex-1 min-w-[200px]">
      <div className="flex justify-between text-sm"><span className="text-slate-500">{label}</span><span className="font-semibold">{done} / {target}</span></div>
      <div className="h-2 bg-slate-100 rounded-full mt-2"><div className="h-2 bg-indigo-500 rounded-full transition-all" style={{ width: pct + '%' }} /></div>
    </div>
  );
}

export default function Today() {
  const { data, reload, me } = useApp();
  const { items, progress } = data.today;
  const mark = async (key, snooze_days = 0) => { await api(`/today/${encodeURIComponent(key)}/done`, { method: 'POST', body: { snooze_days } }); reload(); };
  const counts = {
    companies: data.companies.length, contacts: data.contacts.length,
    sent: data.drafts.filter((d) => d.status !== 'draft').length, applied: data.openings.filter((o) => o.stage !== 'saved').length,
  };

  return (
    <div>
      <PageHead title={`Today${me?.name ? `, ${me.name.split(' ')[0]}` : ''}`} sub={`${items.length} thing${items.length === 1 ? '' : 's'} to move your search forward`} />
      <div className="flex flex-wrap gap-3 mb-6">
        <Bar label="Outreach sent this week" {...progress.outreach} />
        <Bar label="Applications this week" {...progress.applications} />
        <div className="card p-4 flex-1 min-w-[200px] text-sm text-slate-500 grid grid-cols-2 gap-1">
          <span><b className="text-slate-800">{counts.companies}</b> companies</span><span><b className="text-slate-800">{counts.contacts}</b> contacts</span>
          <span><b className="text-slate-800">{counts.sent}</b> sent</span><span><b className="text-slate-800">{counts.applied}</b> applied</span>
        </div>
      </div>

      {!items.length ? (
        <Empty icon={PartyPopper} title="All clear for today">Ask Claude to find new companies or openings, and they'll show up here.</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const T = TRACK[it.track] || TRACK.profile;
            return (
              <div key={it.key} className="card p-3 md:p-4 flex flex-wrap items-center gap-3">
                <span className={`w-8 h-8 rounded-lg grid place-items-center ${T.c}`}><T.icon size={16} /></span>
                <Link to={it.link || '/'} className="flex-1 min-w-[200px]">
                  <div className="font-medium text-slate-800">{it.title}</div>
                  <div className="text-xs text-slate-500">{T.label}{it.detail ? ` · ${it.detail}` : ''}</div>
                </Link>
                <div className="flex gap-1.5">
                  {it.prompt && <CopyButton text={it.prompt} label="Do it with Claude" className="btn-outline !text-violet-700 !border-violet-200" />}
                  <button className="btn-ghost" title="Snooze 1 day" onClick={() => mark(it.key, 1)}><Clock size={14} /></button>
                  <button className="btn-outline" onClick={() => mark(it.key)}><Check size={14} />Done</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
