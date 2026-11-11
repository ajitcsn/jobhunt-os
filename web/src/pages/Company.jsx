import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, ExternalLink, Trash2, Save } from 'lucide-react';
import { useApp } from '../ctx.js';
import { useDock } from '../dock.jsx';
import { api } from '../api.js';
import { ConfirmButton, Form, McpBadge, McpPrompt, QuickAdd, StatusBadge, AtsBadge } from '../ui.jsx';
import { BulkContacts, CONTACT_TYPES, ContactBlock } from '../outreach.jsx';
import { COMPANY_FIELDS } from './Companies.jsx';

const RESEARCH = [
  ['summary', 'What they do'], ['why_fit', 'Why it fits you'], ['recent_news', 'Recent news'],
  ['hiring_signals', 'Hiring signals'], ['outreach_angles', 'Outreach angles'],
];

function Research({ companyId, research, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(research || {});
  useEffect(() => setV(research || {}), [research]);
  const save = async () => { await api(`/companies/${companyId}/research`, { method: 'PUT', body: v }); setEdit(false); onSaved(); };
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">Company intelligence <McpBadge source={research?.source} /></h2>
        {edit ? <button className="btn-primary" onClick={save}><Save size={14} />Save</button> : <button className="btn-ghost" onClick={() => setEdit(true)}><Pencil size={14} />Edit</button>}
      </div>
      {!research && !edit ? (
        <McpPrompt text="Using JobHunt, research this company for my job search and save a concise company intelligence brief with sources." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {RESEARCH.map(([k, label]) => (
            <div key={k} className={k === 'summary' || k === 'outreach_angles' ? 'md:col-span-2' : ''}>
              <div className="label">{label}</div>
              {edit ? <textarea className="input" aria-label={label} rows={3} value={v[k] || ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
                : <p className="text-sm text-slate-700 whitespace-pre-line">{research?.[k] || <span className="text-slate-300">—</span>}</p>}
            </div>
          ))}
          {!edit && research?.sources?.length > 0 && (
            <div className="md:col-span-2 flex flex-wrap gap-2">
              {research.sources.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer" className="chip bg-slate-100 text-slate-600 hover:bg-slate-200"><ExternalLink size={11} className="mr-1" />{s.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}</a>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function Company() {
  const { id } = useParams();
  const { reload, tick, data } = useApp();
  const dock = useDock();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => { try { setC(await api(`/companies/${id}`)); setErr(''); } catch (e) { setErr(e.message); } }, [id]);
  useEffect(() => { load(); }, [load, tick]);
  const refresh = async () => { await load(); reload(); };

  if (err) return <div><Link to="/outbound/companies" className="text-sm text-slate-500 flex items-center gap-1"><ArrowLeft size={14} />Companies</Link><p className="mt-4 text-slate-600">This company could not be found.</p></div>;
  if (!c) return <p className="text-slate-400">Loading…</p>;
  const { company } = c;

  const editCompany = () => dock.open('Edit company', (close) => (
    <Form fields={COMPANY_FIELDS} initial={company} onSubmit={async (v) => { await api(`/companies/${id}`, { method: 'PUT', body: v }); close(); refresh(); }} />
  ));
  const bulk = () => dock.open('Bulk add contacts', (close) => <BulkContacts companyId={company.id} onDone={() => { close(); refresh(); }} />);
  const addContact = async (v) => { await api('/contacts', { method: 'POST', body: { ...v, company_id: company.id } }); await refresh(); };

  return (
    <div className="space-y-5">
      <Link to="/outbound/companies" className="text-sm text-slate-500 flex items-center gap-1"><ArrowLeft size={14} />Companies</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">{company.name} <McpBadge source={company.source} /></h1>
          <p className="text-sm text-slate-500">{[company.sector, company.stage, company.location].filter(Boolean).join(' · ')}
            {company.website && <> · <a className="text-[#0f6b4f]" href={company.website} target="_blank" rel="noreferrer">{company.website.replace(/^https?:\/\//, '')}</a></>}</p>
          {company.fit_reason && <p className="text-sm text-slate-700 mt-2 max-w-2xl">{company.fit_reason}</p>}
        </div>
        <div className="flex gap-2 items-center">
          <label className="sr-only" htmlFor="company-status">Status</label>
          <select id="company-status" className="input !w-auto" value={company.status} onChange={async (e) => { await api(`/companies/${id}`, { method: 'PUT', body: { status: e.target.value } }); refresh(); }}>
            {['shortlisted', 'researched', 'contacted', 'archived'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn-outline" onClick={editCompany}><Pencil size={14} />Edit</button>
          <ConfirmButton confirmLabel="Click again to delete" onConfirm={async () => { await api(`/items/company/${id}`, { method: 'DELETE' }); reload(); nav('/outbound/companies'); }}><Trash2 size={14} /><span className="sr-only">Delete company</span></ConfirmButton>
        </div>
      </div>

      <Research companyId={company.id} research={c.research} onSaved={refresh} />

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div><h2 className="font-semibold">Contacts &amp; outreach</h2><p className="text-xs text-slate-500">Messages live under each person, so every draft stays tied to a company and a contact.</p></div>
          <button className="btn-outline" onClick={bulk}><Plus size={14} />Bulk add</button>
        </div>
        <QuickAdd cta="Add contact" hint="Name and type are enough to start. Add the email or LinkedIn when you find it."
          fields={[
            { k: 'name', label: 'Name', required: true, w: 'flex-[2] min-w-[10rem]' },
            { k: 'role_title', label: 'Role / title' },
            { k: 'type', label: 'Type', type: 'select', default: 'hr', blank: false, w: 'w-40', options: CONTACT_TYPES },
            { k: 'linkedin_url', label: 'LinkedIn URL' },
            { k: 'email', label: 'Email' },
          ]} onAdd={addContact} />
        {!c.contacts.length && <div className="mt-3"><McpPrompt text={`Using JobHunt, find 3 contacts at ${company.name} (one recruiter, one alumnus of my college, and one senior leader in my target function), add them and draft outreach for each.`} /></div>}
        <div className="divide-y divide-slate-100 mt-2">
          {c.contacts.map((p) => <ContactBlock key={p.id} contact={p} onChange={refresh} />)}
        </div>
      </section>

      {c.openings.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold mb-2">Openings here</h2>
          {c.openings.map((o) => (
            <Link to="/applications" key={o.id} className="flex items-center gap-2 py-1.5 text-sm"><AtsBadge score={o.ats_score} /> {o.title} <StatusBadge s={o.stage} /></Link>
          ))}
        </section>
      )}
      <span hidden>{data.contacts.length}</span>
    </div>
  );
}
