import { useState } from 'react';
import { UsersRound } from 'lucide-react';
import { useApp } from '../ctx.js';
import { api } from '../api.js';
import { Empty, PageHead, QuickAdd } from '../ui.jsx';
import { CONTACT_TYPES, ContactBlock } from '../outreach.jsx';

const TYPES = [{ value: 'all', label: 'Everyone' }, ...CONTACT_TYPES.slice(0, 3)];

export default function Contacts() {
  const { data, reload } = useApp();
  const [type, setType] = useState('all');
  const byId = Object.fromEntries(data.companies.map((c) => [c.id, c]));
  const rows = data.contacts.filter((c) => type === 'all' || c.type === type)
    .sort((a, b) => (byId[a.company_id]?.name || '').localeCompare(byId[b.company_id]?.name || '') || a.name.localeCompare(b.name));
  const counts = (t) => data.contacts.filter((c) => c.type === t).length;
  const add = async (v) => { await api('/contacts', { method: 'POST', body: { ...v, company_id: Number(v.company_id) } }); await reload(); };

  return (
    <div className="space-y-4">
      <PageHead title="Contacts" sub={`${data.contacts.length} people across ${new Set(data.contacts.map((c) => c.company_id)).size} companies · ${counts('hr')} recruiters · ${counts('alumni')} alumni · ${counts('leader')} leaders`} />
      {!data.companies.length ? (
        <Empty icon={UsersRound} title="Add a company first">Every contact belongs to a company. Start on the Companies page.</Empty>
      ) : (
        <QuickAdd cta="Add contact" hint="Pick the company, add a name and type. Open drafts and messages from the row below."
          fields={[
            { k: 'company_id', label: 'Company', type: 'select', required: true, placeholder: 'Choose…', w: 'flex-1 min-w-[10rem]', options: data.companies.map((c) => ({ value: c.id, label: c.name })) },
            { k: 'name', label: 'Name', required: true, w: 'flex-[2] min-w-[10rem]' },
            { k: 'role_title', label: 'Role / title' },
            { k: 'type', label: 'Type', type: 'select', default: 'hr', blank: false, w: 'w-40', options: CONTACT_TYPES },
            { k: 'linkedin_url', label: 'LinkedIn URL' },
            { k: 'email', label: 'Email' },
          ]} onAdd={add} />
      )}
      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter by type">
        {TYPES.map((t) => <button key={t.value} role="tab" aria-selected={type === t.value} onClick={() => setType(t.value)} className={`btn !py-1 ${type === t.value ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>)}
      </div>
      {!rows.length ? <Empty title="No contacts here yet">Add one above, or use the prompt on the right to have your assistant find recruiters, alumni and leaders.</Empty> : (
        <section className="card px-5 divide-y divide-slate-100">
          {rows.map((p) => <ContactBlock key={p.id} contact={p} company={byId[p.company_id]} onChange={reload} />)}
        </section>
      )}
    </div>
  );
}
