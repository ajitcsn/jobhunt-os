import { Copy, Pencil, Plus } from 'lucide-react';
import { useApp } from '../ctx.js';
import { useDock } from '../dock.jsx';
import { api } from '../api.js';
import { ConfirmButton, CopyButton, Empty, Form, PageHead } from '../ui.jsx';

const label = (type) => ({ hr: 'Recruiter', alumni: 'Alumni', leader: 'Senior leader', other: 'General' }[type] || type);

export default function Templates() {
  const { data, reload } = useApp();
  const dock = useDock();
  const open = (t) => dock.open(t ? 'Edit template' : 'Add template', (close) => (
    <Form submitLabel="Save template" initial={t || { channel: 'email', contact_type: 'hr' }} fields={[
      { k: 'name', label: 'Template name', required: true, placeholder: 'Recruiter follow-up' },
      { k: 'channel', label: 'Channel', type: 'select', required: true, options: ['email', 'linkedin'] },
      { k: 'contact_type', label: 'Audience', type: 'select', required: true, options: [{ value: 'hr', label: 'Recruiter / HR' }, { value: 'alumni', label: 'Alumni' }, { value: 'leader', label: 'Senior leader' }, { value: 'other', label: 'General' }] },
      { k: 'subject', label: 'Email subject' },
      { k: 'body', label: 'Message', type: 'textarea', rows: 10, required: true, placeholder: 'Hi [Name],…' },
    ]} onSubmit={async (v) => { await api(t ? `/templates/${t.id}` : '/templates', { method: t ? 'PUT' : 'POST', body: v }); await reload(); close(); }} />
  ));
  return (
    <div className="space-y-4">
      <PageHead title="Templates" sub="Reusable starting points. They appear when you write a message to a contact, matched to recruiter, alumni or leader.">
        <button className="btn-primary" onClick={() => open(null)}><Plus size={14} />Add template</button>
      </PageHead>
      {!data.templates?.length ? <Empty icon={Copy} title="No templates yet">Create a starting pattern for a recruiter email, an alumni note or a LinkedIn message.</Empty> : (
        <div className="grid md:grid-cols-2 gap-3">
          {data.templates.map((t) => (
            <article key={t.id} className="card p-4 flex flex-col">
              <div className="flex justify-between gap-2"><div><h2 className="font-semibold">{t.name}</h2><p className="text-xs text-slate-500 mt-0.5">{t.channel} · {label(t.contact_type)}</p></div>
                <button className="btn-ghost !p-1" aria-label={`Edit ${t.name}`} onClick={() => open(t)}><Pencil size={15} /></button></div>
              {t.subject && <p className="text-sm font-medium mt-3">{t.subject}</p>}
              <p className="text-sm text-slate-600 whitespace-pre-line mt-2 line-clamp-5 flex-1">{t.body}</p>
              <div className="flex items-center gap-2 mt-3">
                <CopyButton text={`${t.subject ? `${t.subject}\n\n` : ''}${t.body}`} label="Copy" />
                <span className="ml-auto"><ConfirmButton onConfirm={async () => { await api(`/items/template/${t.id}`, { method: 'DELETE' }); reload(); }}>Delete</ConfirmButton></span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
