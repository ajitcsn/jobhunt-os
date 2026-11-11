import { useState } from 'react';
import { ExternalLink, Pencil, ScanSearch } from 'lucide-react';
import { useApp } from '../ctx.js';
import { useDock } from '../dock.jsx';
import { api, fmtDate } from '../api.js';
import { PageHead, Form, QuickAdd, AtsBadge, McpBadge, McpPrompt, StatusBadge, ConfirmButton } from '../ui.jsx';

const STAGES = [
  { k: 'saved', label: 'Saved', c: 'border-t-slate-300' },
  { k: 'applied', label: 'Applied', c: 'border-t-sky-400' },
  { k: 'interview', label: 'Interview', c: 'border-t-emerald-600' },
  { k: 'offer', label: 'Offer', c: 'border-t-emerald-500' },
  { k: 'closed', label: 'Rejected / ghosted', c: 'border-t-rose-300', match: ['rejected', 'ghosted'] },
];
const ALL_STAGES = ['saved', 'applied', 'interview', 'offer', 'rejected', 'ghosted'];

function AtsDetail({ o }) {
  const checks = o.ats_checks || o.checks || [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><AtsBadge score={o.ats_score} /><span className="text-xs text-slate-500">Scored locally: JD keywords vs your resume, plus hygiene checks</span></div>
      {o.ats_matched?.length > 0 && <div><div className="label">Matched</div><div className="flex flex-wrap gap-1">{o.ats_matched.map((m) => <span key={m} className="chip bg-emerald-50 text-emerald-700">{m}</span>)}</div></div>}
      {o.ats_missing?.length > 0 && <div><div className="label">Missing from your resume</div><div className="flex flex-wrap gap-1">{o.ats_missing.map((m) => <span key={m} className="chip bg-rose-50 text-rose-700">{m}</span>)}</div></div>}
      {checks.length > 0 && <div><div className="label">Resume checks</div>{checks.map((c) => <div key={c.key} className="text-sm">{c.ok ? '✓' : '✗'} <span className={c.ok ? 'text-slate-700' : 'text-rose-600'}>{c.label}</span></div>)}</div>}
    </div>
  );
}

function AtsChecker() {
  const [jd, setJd] = useState('');
  const [r, setR] = useState(null);
  return (
    <div>
      <p className="text-sm text-slate-500 mb-2">Paste any job description. It is compared with your saved resume right here, no AI.</p>
      <label className="label" htmlFor="ats-jd">Job description</label>
      <textarea id="ats-jd" className="input" rows={9} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the JD…" />
      <div className="flex justify-end mt-2"><button className="btn-primary" disabled={!jd.trim()} onClick={async () => setR(await api('/ats', { method: 'POST', body: { jd_text: jd } }))}>Score it</button></div>
      {r && <div className="mt-4 border-t pt-4"><AtsDetail o={{ ats_score: r.score, ats_matched: r.matched, ats_missing: r.missing, ats_checks: r.checks }} /></div>}
    </div>
  );
}

export default function Applications() {
  const { data, reload } = useApp();
  const dock = useDock();
  const [view, setView] = useState('board');
  const move = async (o, stage) => { await api(`/openings/${o.id}`, { method: 'PUT', body: { stage } }); reload(); };

  const openRole = (o) => dock.open(`${o.title}${o.company_name ? ' · ' + o.company_name : ''}`, (close) => (
    <div>
      {o.url && <a href={o.url} target="_blank" rel="noreferrer" className="text-sm text-[#0f6b4f] flex items-center gap-1 mb-3"><ExternalLink size={13} />Open listing</a>}
      <AtsDetail o={o} />
      <div className="border-t mt-4 pt-4">
        <Form initial={o} fields={[
          { k: 'title', label: 'Role title', required: true }, { k: 'stage', label: 'Stage', type: 'select', required: true, options: ALL_STAGES },
          { k: 'deadline', label: 'Deadline', type: 'date' }, { k: 'applied_on', label: 'Applied on', type: 'date' },
          { k: 'url', label: 'Link' }, { k: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
          { k: 'jd_text', label: 'Job description', type: 'textarea', rows: 6 },
        ]} onSubmit={async (v) => { await api(`/openings/${o.id}`, { method: 'PUT', body: v }); await reload(); close(); }} />
        <div className="mt-2"><ConfirmButton onConfirm={async () => { await api(`/items/opening/${o.id}`, { method: 'DELETE' }); await reload(); close(); }}>Delete role</ConfirmButton></div>
      </div>
    </div>
  ));
  const addDetailed = () => dock.open('Add role with JD', (close) => (
    <Form submitLabel="Add role" fields={[
      { k: 'title', label: 'Role title', required: true }, { k: 'company', label: 'Company (new names create a company)' },
      { k: 'url', label: 'Link' }, { k: 'location', label: 'Location' }, { k: 'deadline', label: 'Deadline', type: 'date' },
      { k: 'jd_text', label: 'Job description (for the ATS score)', type: 'textarea', rows: 8 },
    ]} onSubmit={async (v) => { await api('/openings', { method: 'POST', body: v }); await reload(); close(); }} />
  ));
  const quick = () => dock.open('Quick ATS check', () => <AtsChecker />);

  return (
    <div className="space-y-4">
      <PageHead title="Pipeline" sub="Every role you are pursuing, with a local ATS match score.">
        <div className="flex rounded-lg border border-[#cbd6cd] p-0.5" role="tablist" aria-label="View">
          {['board', 'table'].map((x) => <button key={x} role="tab" aria-selected={view === x} className={`btn !py-1 capitalize ${view === x ? 'bg-[#e4f1e9] text-[#0f6b4f]' : 'text-slate-600'}`} onClick={() => setView(x)}>{x}</button>)}
        </div>
        <button className="btn-outline" onClick={quick}><ScanSearch size={14} />Quick ATS check</button>
        <button className="btn-outline" onClick={addDetailed}><Pencil size={14} />Add with JD</button>
      </PageHead>

      <QuickAdd cta="Add role" hint="Add the role now, paste the job description later to get its ATS score."
        fields={[
          { k: 'title', label: 'Role title', required: true, placeholder: 'Product Analyst', w: 'flex-[2] min-w-[11rem]' },
          { k: 'company', label: 'Company', type: 'combo', options: data.companies.map((c) => c.name), placeholder: 'Razorpay', w: 'flex-[2] min-w-[10rem]' },
          { k: 'url', label: 'Link' },
          { k: 'deadline', label: 'Deadline', type: 'date', w: 'w-40' },
        ]} onAdd={async (v) => { await api('/openings', { method: 'POST', body: v }); await reload(); }} />

      {!data.openings.length && <McpPrompt text="Using JobHunt, find 5 current product analyst openings at Bengaluru fintechs that match my profile and add them with the full job description." />}

      {view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-5 gap-3">
          {STAGES.map((s) => {
            const list = data.openings.filter((o) => (s.match || [s.k]).includes(o.stage));
            return (
              <div key={s.k} className={`rounded-xl bg-slate-100/70 border-t-4 ${s.c} p-2 min-h-[110px]`}>
                <div className="text-xs font-semibold text-slate-600 px-1 mb-2">{s.label} <span className="text-slate-400">{list.length}</span></div>
                <div className="space-y-2">
                  {list.map((o) => (
                    <div key={o.id} className="card p-3 hover:shadow-sm">
                      <button className="text-left w-full" onClick={() => openRole(o)}>
                        <div className="font-medium text-sm leading-snug">{o.title}</div>
                        <div className="text-xs text-slate-500">{o.company_name || '—'}{o.location ? ` · ${o.location}` : ''}</div>
                      </button>
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        <AtsBadge score={o.ats_score} /><McpBadge source={o.source} />
                        {o.deadline && o.stage === 'saved' && <span className="chip bg-amber-50 text-amber-700">due {fmtDate(o.deadline)}</span>}
                        {o.applied_on && o.stage !== 'saved' && <span className="text-[11px] text-slate-400">applied {fmtDate(o.applied_on)}</span>}
                      </div>
                      <label className="sr-only" htmlFor={`stage-${o.id}`}>Stage</label>
                      <select id={`stage-${o.id}`} className="input !py-1 !text-xs mt-2" value={o.stage} onChange={(e) => move(o, e.target.value)}>{ALL_STAGES.map((x) => <option key={x}>{x}</option>)}</select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500 border-b border-slate-100"><tr><th className="p-3">Role</th><th className="p-3">Company</th><th className="p-3">Stage</th><th className="p-3">ATS fit</th><th className="p-3">Applied</th><th className="p-3">Deadline</th></tr></thead>
            <tbody>{data.openings.map((o) => (
              <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-[#f3f7f3]">
                <td className="p-3"><button className="font-medium text-left hover:text-[#0f6b4f]" onClick={() => openRole(o)}>{o.title}</button></td>
                <td className="p-3 text-slate-600">{o.company_name || '—'}</td><td className="p-3"><StatusBadge s={o.stage} /></td>
                <td className="p-3"><AtsBadge score={o.ats_score} /></td><td className="p-3 text-slate-500">{fmtDate(o.applied_on) || '—'}</td><td className="p-3 text-slate-500">{fmtDate(o.deadline) || '—'}</td>
              </tr>))}</tbody>
          </table>
          {!data.openings.length && <div className="p-8 text-center text-sm text-slate-500">No roles yet. Add one above.</div>}
        </div>
      )}
    </div>
  );
}
