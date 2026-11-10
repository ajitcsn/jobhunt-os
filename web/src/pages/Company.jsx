import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Mail, UserRound as Linkedin, ExternalLink, Send, Reply, RotateCw, Trash2, Save, GripVertical } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api, fmtDate } from '../api.js';
import { Modal, Form, StatusBadge, TypeBadge, McpBadge, CopyButton, McpPrompt, AtsBadge } from '../ui.jsx';
import { COMPANY_FIELDS } from './Outbound.jsx';

const RESEARCH = [
  ['summary', 'What they do'], ['why_fit', 'Why it fits you'], ['recent_news', 'Recent news'],
  ['hiring_signals', 'Hiring signals'], ['outreach_angles', 'Outreach angles'],
];
const CONTACT_FIELDS = [
  { k: 'name', label: 'Name', required: true },
  { k: 'role_title', label: 'Role / title' },
  { k: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'hr', label: 'HR / recruiter' }, { value: 'alumni', label: 'Alumni' }, { value: 'leader', label: 'Senior leader' }, { value: 'other', label: 'Other' }] },
  { k: 'linkedin_url', label: 'LinkedIn URL' },
  { k: 'email', label: 'Email' },
  { k: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
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
              {edit ? <textarea className="input" rows={3} value={v[k] || ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
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

function Draft({ d, contact, onChange }) {
  const [v, setV] = useState({ subject: d.subject || '', body: d.body || '' });
  const dirty = v.subject !== (d.subject || '') || v.body !== (d.body || '');
  useEffect(() => setV({ subject: d.subject || '', body: d.body || '' }), [d.subject, d.body]);
  const put = async (body) => { await api(`/drafts/${d.id}`, { method: 'PUT', body }); onChange(); };
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email || '')}&su=${encodeURIComponent(v.subject)}&body=${encodeURIComponent(v.body)}`;
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
        {d.channel === 'email' ? <Mail size={14} className="text-slate-500" /> : <Linkedin size={14} className="text-slate-500" />}
        <StatusBadge s={d.status} /><McpBadge source={d.source} />
        {d.sent_at && <span className="text-slate-500">Sent {fmtDate(d.sent_at)}</span>}
        {d.status === 'sent' && d.follow_up_on && <span className="text-slate-500">· follow up {fmtDate(d.follow_up_on)}{d.follow_up_count ? ` (${d.follow_up_count} done)` : ''}</span>}
      </div>
      {d.channel === 'email' && <input className="input mb-2 font-medium" placeholder="Subject" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} />}
      <textarea className="input text-sm" rows={6} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
      <div className="flex flex-wrap gap-1.5 mt-2 items-center">
        {dirty && <button className="btn-primary" onClick={() => put(v)}><Save size={14} />Save edits</button>}
        <CopyButton text={(d.channel === 'email' && v.subject ? v.subject + '\n\n' : '') + v.body} />
        {d.channel === 'email' && <a className="btn-outline" href={gmail} target="_blank" rel="noreferrer"><Mail size={14} />Open in Gmail</a>}
        {d.channel === 'linkedin' && contact.linkedin_url && <a className="btn-outline" href={contact.linkedin_url} target="_blank" rel="noreferrer"><Linkedin size={14} />Open profile</a>}
        {d.status === 'draft' && <button className="btn-outline !text-sky-700" onClick={() => put({ ...v, status: 'sent' })}><Send size={14} />Mark sent</button>}
        {d.status === 'sent' && <button className="btn-outline" onClick={() => put({ followed_up: true })}><RotateCw size={14} />Followed up</button>}
        {d.status === 'sent' && <button className="btn-outline !text-emerald-700" onClick={() => put({ status: 'replied' })}><Reply size={14} />Got a reply</button>}
        <button className="btn-ghost ml-auto !text-slate-400" title="Delete draft" onClick={async () => { await api(`/items/draft/${d.id}`, { method: 'DELETE' }); onChange(); }}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function DraftComposer({ contact, templates, onDone }) {
  const [v, setV] = useState({ channel: contact.email ? 'email' : 'linkedin', subject: '', body: '' });
  const [dragOver, setDragOver] = useState(false);
  const compatible = templates.filter((t) => t.channel === v.channel && (t.contact_type === contact.type || t.contact_type === 'other'));
  const applyTemplate = (template) => setV({ ...v, channel: template.channel, subject: template.subject || '', body: template.body || '' });
  return <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); const id = Number(e.dataTransfer.getData('text/template-id')); const t = templates.find((x) => x.id === id); if (t) applyTemplate(t); }}>
    <p className="text-sm text-slate-500 mb-3">Choose or drag a relevant template below, then personalize it before saving.</p>
    {!!compatible.length && <div className="flex flex-wrap gap-2 mb-3">{compatible.map((t) => <button key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/template-id', String(t.id))} className="btn-outline cursor-grab active:cursor-grabbing" onClick={() => applyTemplate(t)}><GripVertical size={13} aria-hidden="true" />{t.name}</button>)}</div>}
    <div className={`rounded-lg border-2 border-dashed p-3 transition-colors ${dragOver ? 'border-[#0f6b4f] bg-[#eef6f0]' : 'border-[#cbd6cd]'}`}>
      <label className="label" htmlFor="draft-channel">Channel</label><select id="draft-channel" className="input" value={v.channel} onChange={(e) => setV({ ...v, channel: e.target.value })}><option value="email">email</option><option value="linkedin">linkedin</option></select>
      {v.channel === 'email' && <><label className="label mt-3" htmlFor="draft-subject">Subject</label><input id="draft-subject" className="input" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} placeholder="A specific subject…" /></>}
      <label className="label mt-3" htmlFor="draft-body">Message</label><textarea id="draft-body" className="input" rows={8} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} placeholder="Write your message…" />
      <div className="flex justify-end mt-3"><button className="btn-primary" disabled={!v.body.trim()} onClick={async () => { await api('/drafts', { method: 'POST', body: { ...v, contact_id: contact.id } }); onDone(); }}><Save size={14} />Save draft</button></div>
    </div>
  </div>;
}

export default function Company() {
  const { id } = useParams();
  const { reload, tick, data } = useApp();
  const [c, setC] = useState(null);
  const [modal, setModal] = useState(null);
  const [bulkContacts, setBulkContacts] = useState('');
  const nav = useNavigate();
  const load = async () => setC(await api(`/companies/${id}`));
  useEffect(() => { load(); }, [id, tick]);
  const refresh = async () => { await load(); reload(); };

  if (!c) return <p className="text-slate-400">Loading…</p>;
  const { company } = c;

  return (
    <div className="space-y-5">
      <Link to="/outbound" className="text-sm text-slate-500 flex items-center gap-1"><ArrowLeft size={14} />Outbound</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">{company.name} <McpBadge source={company.source} /></h1>
          <p className="text-sm text-slate-500">{[company.sector, company.stage, company.location].filter(Boolean).join(' · ')}
            {company.website && <> · <a className="text-[#0f6b4f]" href={company.website} target="_blank" rel="noreferrer">{company.website.replace(/^https?:\/\//, '')}</a></>}</p>
          {company.fit_reason && <p className="text-sm text-slate-700 mt-2 max-w-2xl">{company.fit_reason}</p>}
        </div>
        <div className="flex gap-2 items-center">
          <select className="input !w-auto" value={company.status} onChange={async (e) => { await api(`/companies/${id}`, { method: 'PUT', body: { status: e.target.value } }); refresh(); }}>
            {['shortlisted', 'researched', 'contacted', 'archived'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn-outline" onClick={() => setModal('company')}><Pencil size={14} />Edit</button>
          <button className="btn-ghost !text-slate-400" title="Delete company" onClick={async () => { if (confirm(`Delete ${company.name} and its contacts?`)) { await api(`/items/company/${id}`, { method: 'DELETE' }); reload(); nav('/outbound'); } }}><Trash2 size={14} /></button>
        </div>
      </div>

      <Research companyId={company.id} research={c.research} onSaved={refresh} />

      <section className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Contacts & outreach</h2>
          <button className="btn-outline" onClick={() => setModal('bulk-contact')}><Plus size={14} />Bulk add</button>
          <button className="btn-primary" onClick={() => setModal('contact')}><Plus size={14} />Add contact</button>
        </div>
        {!c.contacts.length && <div className="mt-3"><McpPrompt text={`Using JobHunt, find 3 contacts at ${company.name} (one recruiter, one alumnus of my college, and one senior leader in my target function), add them and draft outreach for each.`} /></div>}
        <div className="divide-y divide-slate-100">
          {c.contacts.map((p) => {
            const drafts = c.drafts.filter((d) => d.contact_id === p.id);
            return (
              <div key={p.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.name}</span><TypeBadge type={p.type} /><StatusBadge s={p.status} /><McpBadge source={p.source} />
                  <span className="text-sm text-slate-500">{p.role_title}</span>
                  <div className="ml-auto flex gap-1">
                    {p.linkedin_url && <a className="btn-ghost" href={p.linkedin_url} target="_blank" rel="noreferrer"><Linkedin size={14} /></a>}
                    <button className="btn-ghost" onClick={() => setModal({ contact: p })}><Pencil size={14} /></button>
                    <button className="btn-ghost" onClick={() => setModal({ draftFor: p })}><Plus size={14} />Draft</button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{p.email || 'No email yet'}{p.notes ? ` · ${p.notes}` : ''}</div>
                {drafts.map((d) => <Draft key={d.id} d={d} contact={p} onChange={refresh} />)}
              </div>
            );
          })}
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

      {modal === 'company' && <Modal title="Edit company" onClose={() => setModal(null)}>
        <Form fields={[...COMPANY_FIELDS]} initial={company} onSubmit={async (v) => { await api(`/companies/${id}`, { method: 'PUT', body: v }); setModal(null); refresh(); }} />
      </Modal>}
      {modal === 'contact' && <Modal title="Add contact" onClose={() => setModal(null)}>
        <Form fields={CONTACT_FIELDS} initial={{ type: 'hr' }} onSubmit={async (v) => { await api('/contacts', { method: 'POST', body: { ...v, company_id: company.id } }); setModal(null); refresh(); }} />
      </Modal>}
      {modal === 'bulk-contact' && <Modal title="Bulk add contacts" onClose={() => setModal(null)}>
        <p className="text-sm text-slate-500 mb-3">Paste one person per line: <b>Name | Title | type | LinkedIn URL | email</b>. Types: hr, alumni, leader, other.</p>
        <label className="label" htmlFor="bulk-contacts">Contacts</label><textarea id="bulk-contacts" className="input" rows={8} value={bulkContacts} onChange={(e) => setBulkContacts(e.target.value)} placeholder={'Priya Shah | Talent Partner | hr | https://linkedin.com/in/priya | priya@company.com\nArjun Rao | Product Director | leader | https://linkedin.com/in/arjun |'} />
        <div className="flex justify-end mt-3"><button className="btn-primary" onClick={async () => { const rows = bulkContacts.split('\n').map((line) => line.split('|').map((x) => x.trim())).filter((x) => x[0]); await Promise.all(rows.map(([name, role_title, type, linkedin_url, email]) => api('/contacts', { method: 'POST', body: { name, role_title, type: ['hr', 'alumni', 'leader', 'other'].includes(type) ? type : 'other', linkedin_url, email, company_id: company.id } }))); setBulkContacts(''); setModal(null); refresh(); }}>Add contacts</button></div>
      </Modal>}
      {modal?.contact && <Modal title={`Edit ${modal.contact.name}`} onClose={() => setModal(null)}>
        <Form fields={[...CONTACT_FIELDS, { k: 'status', label: 'Status', type: 'select', required: true, options: ['new', 'drafted', 'sent', 'replied', 'closed'] }]} initial={modal.contact}
          onSubmit={async (v) => { await api(`/contacts/${modal.contact.id}`, { method: 'PUT', body: v }); setModal(null); refresh(); }} />
      </Modal>}
      {modal?.draftFor && <Modal title={`New message to ${modal.draftFor.name}`} onClose={() => setModal(null)}>
        <DraftComposer contact={modal.draftFor} templates={data.templates || []} onDone={() => { setModal(null); refresh(); }} />
      </Modal>}
    </div>
  );
}
