import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Pencil, Send, BriefcaseBusiness, FolderKanban, User, CircleCheckBig } from 'lucide-react';
import { useApp } from '../ctx.js';
import { api } from '../api.js';
import { PageHead, CopyButton, Empty } from '../ui.jsx';

const TRACK = {
  outbound: { icon: Send, label: 'Outbound', c: 'text-sky-600 bg-sky-50' },
  inbound: { icon: BriefcaseBusiness, label: 'Applications', c: 'text-emerald-600 bg-emerald-50' },
  projects: { icon: FolderKanban, label: 'Projects', c: 'text-amber-600 bg-amber-50' },
  profile: { icon: User, label: 'Profile', c: 'text-[#0f6b4f] bg-[#e4f1e9]' },
};

function Bar({ label, done, target, field, onSave }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(target);
  const pct = Math.min(100, Math.round((100 * done) / (target || 1)));
  const save = async () => { const n = Math.max(1, Math.min(200, Number(val) || 1)); setEdit(false); if (n !== target) await onSave(field, n); };
  return (
    <div className="card p-4 flex-1 min-w-[200px]">
      <div className="flex justify-between items-center text-sm"><span className="text-slate-500">{label}</span>
        {edit ? <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); save(); }}><span className="font-semibold">{done} /</span><input autoFocus type="number" min="1" max="200" aria-label={`${label} weekly target`} className="input !w-16 !py-0.5 text-sm" value={val} onChange={(e) => setVal(e.target.value)} onBlur={save} /></form>
          : <button className="font-semibold flex items-center gap-1 hover:text-[#0f6b4f]" aria-label={`Edit weekly target, now ${target}`} onClick={() => { setVal(target); setEdit(true); }}>{done} / {target}<Pencil size={12} className="text-slate-400" /></button>}</div>
      <div className="h-2 bg-slate-100 rounded-full mt-2"><div className="h-2 bg-[#0f6b4f] rounded-full transition-[width] duration-150" style={{ width: pct + '%' }} /></div>
    </div>
  );
}

export default function Today() {
  const { data, reload, me } = useApp();
  const { items, progress } = data.today;
  const mark = async (key, snooze_days = 0) => { await api(`/today/${encodeURIComponent(key)}/done`, { method: 'POST', body: { snooze_days } }); reload(); };
  const setTarget = async (field, n) => { await api('/profile', { method: 'PUT', body: { [field]: n } }); reload(); };
  const counts = {
    companies: data.companies.length, contacts: data.contacts.length,
    sent: data.drafts.filter((d) => d.status !== 'draft').length, applied: data.openings.filter((o) => o.stage !== 'saved').length,
  };

  return (
    <div>
      <PageHead title={`Command center${me?.name ? `, ${me.name.split(' ')[0]}` : ''}`} sub={`${items.length} action${items.length === 1 ? '' : 's'} that move your search forward this week`} />
      <div className="flex flex-wrap gap-3 mb-6">
        <Bar label="Outreach sent this week" field="weekly_outreach_target" onSave={setTarget} {...progress.outreach} />
        <Bar label="Applications this week" field="weekly_applications_target" onSave={setTarget} {...progress.applications} />
        <div className="card p-4 flex-1 min-w-[200px] text-sm text-slate-500 grid grid-cols-2 gap-1">
          <span><b className="text-slate-800">{counts.companies}</b> companies</span><span><b className="text-slate-800">{counts.contacts}</b> contacts</span>
          <span><b className="text-slate-800">{counts.sent}</b> sent</span><span><b className="text-slate-800">{counts.applied}</b> applied</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {[
          { to: '/outbound/companies', icon: Send, t: 'Outbound', a: `${counts.companies} companies · ${counts.contacts} contacts`, b: `${counts.sent} messages sent`, c: 'text-sky-600 bg-sky-50' },
          { to: '/applications', icon: BriefcaseBusiness, t: 'Applications', a: `${data.openings.length} roles tracked`, b: `${counts.applied} applied`, c: 'text-emerald-600 bg-emerald-50' },
          { to: '/projects', icon: FolderKanban, t: 'Projects', a: `${data.projects.length} projects`, b: data.gaps[0] ? `${data.gaps[0].readiness}% ready for ${data.gaps[0].label}` : 'Pick a target role', c: 'text-amber-600 bg-amber-50' },
        ].map((x) => <Link key={x.t} to={x.to} className="card p-4 flex gap-3 hover:shadow-sm"><span className={`w-9 h-9 rounded-lg grid place-items-center ${x.c}`}><x.icon size={17} /></span><div><div className="font-semibold">{x.t}</div><div className="text-xs text-slate-500">{x.a}</div><div className="text-xs text-slate-500">{x.b}</div></div></Link>)}
      </div>

      {!items.length ? (
        <Empty icon={CircleCheckBig} title="All clear for today">Use your connected assistant to add companies or applications when you are ready for the next move.</Empty>
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
                  {it.prompt && <CopyButton text={it.prompt} label="Copy prompt" className="btn-outline !text-[#0f6b4f] !border-[#b8d9ca]" />}
                  <button className="btn-ghost" aria-label="Snooze for 1 day" title="Snooze 1 day" onClick={() => mark(it.key, 1)}><Clock size={14} /></button>
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
