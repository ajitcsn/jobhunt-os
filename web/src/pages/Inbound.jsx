import { useState } from 'react';
import { Plus, ExternalLink, ScanSearch, Trash2 } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api, fmtDate } from '../api.js';
import { PageHead, Modal, Form, AtsBadge, ClaudeBadge, ClaudePrompt } from '../ui.jsx';

const STAGES = [
  { k: 'saved', label: 'Saved', c: 'border-t-slate-300' },
  { k: 'applied', label: 'Applied', c: 'border-t-sky-400' },
  { k: 'interview', label: 'Interview', c: 'border-t-indigo-500' },
  { k: 'offer', label: 'Offer', c: 'border-t-emerald-500' },
  { k: 'closed', label: 'Rejected / ghosted', c: 'border-t-rose-300', match: ['rejected', 'ghosted'] },
];
const ALL_STAGES = ['saved', 'applied', 'interview', 'offer', 'rejected', 'ghosted'];

function AtsDetail({ o }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><AtsBadge score={o.ats_score} /><span className="text-xs text-slate-500">Scored locally: JD keywords vs your résumé, plus résumé hygiene checks</span></div>
      {o.ats_matched?.length > 0 && <div><div className="label">Matched</div><div className="flex flex-wrap gap-1">{o.ats_matched.map((m) => <span key={m} className="chip bg-emerald-50 text-emerald-700">{m}</span>)}</div></div>}
      {o.ats_missing?.length > 0 && <div><div className="label">Missing from your résumé</div><div className="flex flex-wrap gap-1">{o.ats_missing.map((m) => <span key={m} className="chip bg-rose-50 text-rose-700">{m}</span>)}</div></div>}
      {(o.ats_checks || o.checks)?.length > 0 && <div><div className="label">Résumé checks</div>{(o.ats_checks || o.checks).map((c) => <div key={c.key} className="text-sm">{c.ok ? '✓' : '✗'} <span className={c.ok ? 'text-slate-700' : 'text-rose-600'}>{c.label}</span></div>)}</div>}
    </div>
  );
}

function AtsChecker({ onClose }) {
  const [jd, setJd] = useState('');
  const [r, setR] = useState(null);
  return (
    <Modal title="Quick ATS check" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-2">Paste any job description. We compare it with your saved résumé, right here, no AI.</p>
      <textarea className="input" rows={8} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the JD…" />
      <div className="flex justify-end mt-2"><button className="btn-primary" onClick={async () => setR(await api('/ats', { method: 'POST', body: { jd_text: jd } }))}>Score it</button></div>
      {r && <div className="mt-4 border-t pt-4"><AtsDetail o={{ ats_score: r.score, ats_matched: r.matched, ats_missing: r.missing, ats_checks: r.checks }} /></div>}
    </Modal>
  );
}

export default function Inbound() {
  const { data, reload } = useApp();
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [checker, setChecker] = useState(false);
  const companies = data.companies.map((c) => ({ value: c.id, label: c.name }));

  const move = async (o, stage) => { await api(`/openings/${o.id}`, { method: 'PUT', body: { stage } }); reload(); };
  const FIELDS = [
    { k: 'title', label: 'Role title', required: true },
    { k: 'company', label: 'Company (type a name)', placeholder: 'e.g. Razorpay' },
    { k: 'url', label: 'Link' }, { k: 'location', label: 'Location' }, { k: 'deadline', label: 'Deadline', type: 'date' },
    { k: 'jd_text', label: 'Job description (for the ATS score)', type: 'textarea', rows: 5 },
  ];

  return (
    <div>
      <PageHead title="Inbound" sub="Openings, programmes and applications, with a local ATS match score">
        <button className="btn-outline" onClick={() => setChecker(true)}><ScanSearch size={14} />Quick ATS check</button>
        <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} />Add opening</button>
      </PageHead>
      <div className="mb-4"><ClaudePrompt text="Using JobHunt, find 5 current product analyst openings or programmes at Bengaluru fintechs that match my profile and add them with the JD text." /></div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STAGES.map((s) => {
          const list = data.openings.filter((o) => (s.match || [s.k]).includes(o.stage));
          return (
            <div key={s.k} className={`rounded-xl bg-slate-100/70 border-t-4 ${s.c} p-2 min-h-[120px]`}>
              <div className="text-xs font-semibold text-slate-600 px-1 mb-2">{s.label} <span className="text-slate-400">{list.length}</span></div>
              <div className="space-y-2">
                {list.map((o) => (
                  <div key={o.id} className="card p-3 cursor-pointer hover:shadow-sm" onClick={() => setOpen(o)}>
                    <div className="font-medium text-sm leading-snug">{o.title}</div>
                    <div className="text-xs text-slate-500">{o.company_name || '—'}{o.location ? ` · ${o.location}` : ''}</div>
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <AtsBadge score={o.ats_score} /><ClaudeBadge source={o.source} />
                      {o.deadline && o.stage === 'saved' && <span className="chip bg-amber-50 text-amber-700">due {fmtDate(o.deadline)}</span>}
                      {o.applied_on && o.stage !== 'saved' && <span className="text-[11px] text-slate-400">applied {fmtDate(o.applied_on)}</span>}
                    </div>
                    <select className="input !py-1 !text-xs mt-2" value={o.stage} onClick={(e) => e.stopPropagation()} onChange={(e) => move(o, e.target.value)}>
                      {ALL_STAGES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <Modal title={`${open.title}${open.company_name ? ' · ' + open.company_name : ''}`} onClose={() => setOpen(null)}>
          {open.url && <a href={open.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 flex items-center gap-1 mb-3"><ExternalLink size={13} />Open listing</a>}
          <AtsDetail o={open} />
          <div className="border-t mt-4 pt-4">
            <Form fields={[
              { k: 'title', label: 'Role title', required: true }, { k: 'stage', label: 'Stage', type: 'select', required: true, options: ALL_STAGES },
              { k: 'deadline', label: 'Deadline', type: 'date' }, { k: 'applied_on', label: 'Applied on', type: 'date' },
              { k: 'url', label: 'Link' }, { k: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
              { k: 'jd_text', label: 'Job description', type: 'textarea', rows: 6 },
            ]} initial={open} onSubmit={async (v) => { await api(`/openings/${open.id}`, { method: 'PUT', body: v }); await reload(); setOpen(null); }} />
            <button className="btn-ghost !text-slate-400 mt-2" onClick={async () => { await api(`/items/opening/${open.id}`, { method: 'DELETE' }); reload(); setOpen(null); }}><Trash2 size={14} />Delete</button>
          </div>
        </Modal>
      )}
      {adding && <Modal title="Add opening" onClose={() => setAdding(false)}>
        <Form fields={FIELDS} onSubmit={async (v) => { await api('/openings', { method: 'POST', body: v }); await reload(); setAdding(false); }} />
        {!!companies.length && <p className="text-xs text-slate-400 mt-2">Existing companies match by name; new names create a company.</p>}
      </Modal>}
      {checker && <AtsChecker onClose={() => setChecker(false)} />}
    </div>
  );
}
