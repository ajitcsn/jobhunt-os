// Contacts and their drafts. Drafts only ever live inside a contact (and so inside a company).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, UserRound as Linkedin, Pencil, Plus, Reply, RotateCw, Save, Send, Trash2, GripVertical } from 'lucide-react';
import { api, fmtDate } from './api.js';
import { useApp } from './ctx.js';
import { useDock } from './dock.jsx';
import { ConfirmButton, CopyButton, Form, McpBadge, StatusBadge, TypeBadge } from './ui.jsx';

export const CONTACT_TYPES = [
  { value: 'hr', label: 'HR / recruiter' }, { value: 'alumni', label: 'Alumni' }, { value: 'leader', label: 'Senior leader' }, { value: 'other', label: 'Other' },
];
export const CONTACT_FIELDS = [
  { k: 'name', label: 'Name', required: true },
  { k: 'role_title', label: 'Role / title' },
  { k: 'type', label: 'Type', type: 'select', required: true, options: CONTACT_TYPES },
  { k: 'linkedin_url', label: 'LinkedIn URL' },
  { k: 'email', label: 'Email' },
  { k: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
];

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
      {d.channel === 'email' && <input className="input mb-2 font-medium" aria-label="Subject" placeholder="Subject" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} />}
      <textarea className="input text-sm" aria-label="Message" rows={6} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
      <div className="flex flex-wrap gap-1.5 mt-2 items-center">
        {dirty && <button className="btn-primary" onClick={() => put(v)}><Save size={14} />Save edits</button>}
        <CopyButton text={(d.channel === 'email' && v.subject ? v.subject + '\n\n' : '') + v.body} />
        {d.channel === 'email' && <a className="btn-outline" href={gmail} target="_blank" rel="noreferrer"><Mail size={14} />Open in Gmail</a>}
        {d.channel === 'linkedin' && contact.linkedin_url && <a className="btn-outline" href={contact.linkedin_url} target="_blank" rel="noreferrer"><Linkedin size={14} />Open profile</a>}
        {d.status === 'draft' && <button className="btn-outline !text-sky-700" onClick={() => put({ ...v, status: 'sent' })}><Send size={14} />Mark sent</button>}
        {d.status === 'sent' && <button className="btn-outline" onClick={() => put({ followed_up: true })}><RotateCw size={14} />Followed up</button>}
        {d.status === 'sent' && <button className="btn-outline !text-emerald-700" onClick={() => put({ status: 'replied' })}><Reply size={14} />Got a reply</button>}
        <span className="ml-auto"><ConfirmButton onConfirm={async () => { await api(`/items/draft/${d.id}`, { method: 'DELETE' }); onChange(); }}><Trash2 size={14} /><span className="sr-only">Delete draft</span></ConfirmButton></span>
      </div>
    </div>
  );
}

function DraftComposer({ contact, templates, onDone }) {
  const [v, setV] = useState({ channel: contact.email ? 'email' : 'linkedin', subject: '', body: '' });
  const [dragOver, setDragOver] = useState(false);
  const compatible = templates.filter((t) => t.channel === v.channel && (t.contact_type === contact.type || t.contact_type === 'other'));
  const apply = (t) => setV({ ...v, channel: t.channel, subject: t.subject || '', body: t.body || '' });
  return (
    <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const t = templates.find((x) => x.id === Number(e.dataTransfer.getData('text/template-id'))); if (t) apply(t); }}>
      <p className="text-sm text-slate-500 mb-3">Message to <b className="text-slate-800">{contact.name}</b>. Pick a template (or drag one in), then personalise it.</p>
      {!!compatible.length && (
        <div className="flex flex-wrap gap-2 mb-3">
          {compatible.map((t) => <button key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/template-id', String(t.id))} className="btn-outline cursor-grab" onClick={() => apply(t)}><GripVertical size={13} aria-hidden="true" />{t.name}</button>)}
        </div>
      )}
      <div className={`rounded-lg border-2 border-dashed p-3 transition-colors ${dragOver ? 'border-[#0f6b4f] bg-[#eef6f0]' : 'border-[#cbd6cd]'}`}>
        <label className="label" htmlFor="draft-channel">Channel</label>
        <select id="draft-channel" className="input" value={v.channel} onChange={(e) => setV({ ...v, channel: e.target.value })}><option value="email">email</option><option value="linkedin">linkedin</option></select>
        {v.channel === 'email' && <><label className="label mt-3" htmlFor="draft-subject">Subject</label><input id="draft-subject" className="input" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} placeholder="A specific subject…" /></>}
        <label className="label mt-3" htmlFor="draft-body">Message</label>
        <textarea id="draft-body" className="input" rows={10} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} placeholder="Write your message…" />
        <div className="flex justify-end mt-3"><button className="btn-primary" disabled={!v.body.trim()} onClick={async () => { await api('/drafts', { method: 'POST', body: { ...v, contact_id: contact.id } }); onDone(); }}><Save size={14} />Save draft</button></div>
      </div>
    </div>
  );
}

export function BulkContacts({ companyId, onDone }) {
  const [text, setText] = useState('');
  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">One person per line: <b>Name | Title | type | LinkedIn URL | email</b>. Types: hr, alumni, leader, other.</p>
      <label className="label" htmlFor="bulk-contacts">Contacts</label>
      <textarea id="bulk-contacts" className="input" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Priya Shah | Talent Partner | hr | https://linkedin.com/in/priya | priya@company.com\nArjun Rao | Product Director | leader | https://linkedin.com/in/arjun |'} />
      <div className="flex justify-end mt-3">
        <button className="btn-primary" disabled={!text.trim()} onClick={async () => {
          const rows = text.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]);
          for (const [name, role_title, type, linkedin_url, email] of rows) {
            await api('/contacts', { method: 'POST', body: { name, role_title, type: ['hr', 'alumni', 'leader', 'other'].includes(type) ? type : 'other', linkedin_url, email, company_id: companyId } });
          }
          onDone();
        }}>Add contacts</button>
      </div>
    </div>
  );
}

// One contact, with its drafts inline. Used on the company page and on the Contacts page.
export function ContactBlock({ contact: p, company, onChange }) {
  const { data } = useApp();
  const dock = useDock();
  const drafts = data.drafts.filter((d) => d.contact_id === p.id);
  const edit = () => dock.open(`Edit ${p.name}`, (close) => (
    <Form fields={[...CONTACT_FIELDS, { k: 'status', label: 'Status', type: 'select', required: true, options: ['new', 'drafted', 'sent', 'replied', 'closed'] }]} initial={p}
      onSubmit={async (v) => { await api(`/contacts/${p.id}`, { method: 'PUT', body: v }); close(); onChange(); }} />
  ));
  const compose = () => dock.open('New message', (close) => (
    <DraftComposer contact={p} templates={data.templates || []} onDone={() => { close(); onChange(); }} />
  ));
  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{p.name}</span><TypeBadge type={p.type} /><StatusBadge s={p.status} /><McpBadge source={p.source} />
        <span className="text-sm text-slate-500">{p.role_title}</span>
        <div className="ml-auto flex gap-1">
          {p.linkedin_url && <a className="btn-ghost" href={p.linkedin_url} target="_blank" rel="noreferrer" aria-label={`${p.name} on LinkedIn`}><Linkedin size={14} /></a>}
          <button className="btn-ghost" onClick={edit} aria-label={`Edit ${p.name}`}><Pencil size={14} /></button>
          <button className="btn-outline" onClick={compose}><Plus size={14} />Draft</button>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-0.5">
        {company && <><Link className="text-[#0f6b4f] font-medium" to={`/outbound/companies/${company.id}`}>{company.name}</Link> · </>}
        {p.email || 'No email yet'}{p.notes ? ` · ${p.notes}` : ''}
      </div>
      {drafts.map((d) => <Draft key={d.id} d={d} contact={p} onChange={onChange} />)}
    </div>
  );
}
