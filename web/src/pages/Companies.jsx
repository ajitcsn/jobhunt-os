import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import { useApp } from '../ctx.js';
import { useDock } from '../dock.jsx';
import { api, fmtDate } from '../api.js';
import { PageHead, Form, QuickAdd, StatusBadge, McpBadge, Empty } from '../ui.jsx';

export const COMPANY_FIELDS = [
  { k: 'name', label: 'Company name', required: true },
  { k: 'website', label: 'Website' },
  { k: 'sector', label: 'Sector' },
  { k: 'stage', label: 'Stage' },
  { k: 'location', label: 'Location' },
  { k: 'fit_reason', label: 'Why it fits you', type: 'textarea', rows: 3 },
  { k: 'priority', label: 'Priority', type: 'select', required: true, options: [{ value: 1, label: '1 · Top fit' }, { value: 2, label: '2 · Good fit' }, { value: 3, label: '3 · Stretch' }] },
];
const FILTERS = ['all', 'shortlisted', 'researched', 'contacted', 'archived'];

function BulkCompanies({ onDone }) {
  const [text, setText] = useState('');
  const names = text.split('\n').map((x) => x.trim()).filter(Boolean);
  return (
    <div>
      <label className="label" htmlFor="bulk-companies">Paste companies, one per line</label>
      <textarea id="bulk-companies" className="input" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Razorpay\nCRED\nJupiter'} />
      <p className="text-xs text-slate-500 mt-1">Add the details later. This just gets them onto your list.</p>
      <div className="flex justify-end mt-3">
        <button className="btn-primary" disabled={!names.length} onClick={async () => { for (const name of names) await api('/companies', { method: 'POST', body: { name, priority: 2 } }); onDone(); }}>Add {names.length || ''} companies</button>
      </div>
    </div>
  );
}

export default function Companies() {
  const { data, reload } = useApp();
  const dock = useDock();
  const nav = useNavigate();
  const [filter, setFilter] = useState('all');
  const rows = data.companies.filter((c) => (filter === 'all' ? c.status !== 'archived' : c.status === filter));
  const pending = data.drafts.filter((d) => d.status === 'draft').length;
  const replied = data.drafts.filter((d) => d.status === 'replied').length;

  const quickAdd = async (v) => {
    await api('/companies', { method: 'POST', body: { ...v, priority: Number(v.priority) || 2 } });
    await reload();
  };
  const openFull = () => dock.open('Add company', (close) => (
    <Form fields={COMPANY_FIELDS} initial={{ priority: 2 }} submitLabel="Add company" onSubmit={async (v) => {
      const c = await api('/companies', { method: 'POST', body: v });
      await reload(); close(); nav(`/outbound/companies/${c.id}`);
    }} />
  ));
  const openBulk = () => dock.open('Bulk add companies', (close) => <BulkCompanies onDone={async () => { await reload(); close(); }} />);

  return (
    <div className="space-y-4">
      <PageHead title="Companies" sub={`${data.companies.length} targets · ${data.contacts.length} contacts · ${pending} drafts to send · ${replied} replies`}>
        <button className="btn-outline" onClick={openBulk}>Bulk add</button>
        <button className="btn-primary" onClick={openFull}><Plus size={14} />Add with details</button>
      </PageHead>

      <QuickAdd cta="Add company" hint="Type a name and press Enter. Open a company to add research, contacts and drafts."
        fields={[
          { k: 'name', label: 'Company', required: true, placeholder: 'e.g. Razorpay', w: 'flex-[2] min-w-[11rem]' },
          { k: 'sector', label: 'Sector', placeholder: 'Payments' },
          { k: 'location', label: 'Location', placeholder: 'Bengaluru' },
          { k: 'priority', label: 'Priority', type: 'select', default: '2', blank: false, w: 'w-36', options: [{ value: 1, label: '1 · Top fit' }, { value: 2, label: '2 · Good fit' }, { value: 3, label: '3 · Stretch' }] },
        ]} onAdd={quickAdd} />

      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`btn !py-1 capitalize ${filter === f ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{f}</button>
        ))}
      </div>

      {!rows.length ? (
        <Empty icon={Building2} title="No companies here yet">Add one above, or ask your connected assistant using the prompt on the right.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500 border-b border-slate-100">
              <tr><th className="p-3">Company</th><th className="p-3">Status</th><th className="p-3 hidden lg:table-cell">Why it fits</th><th className="p-3 text-center">Contacts</th><th className="p-3 text-center">Sent</th><th className="p-3 hidden md:table-cell">Updated</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-[#f3f7f3] cursor-pointer" onClick={() => nav(`/outbound/companies/${c.id}`)}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-6 rounded ${c.priority === 1 ? 'bg-[#0f6b4f]' : c.priority === 2 ? 'bg-[#b8d9ca]' : 'bg-slate-200'}`} />
                      <div>
                        <Link to={`/outbound/companies/${c.id}`} className="font-medium text-slate-900" onClick={(e) => e.stopPropagation()}>{c.name}</Link>
                        <div className="text-xs text-slate-400">{[c.sector, c.stage, c.location].filter(Boolean).join(' · ')}</div>
                      </div>
                      <McpBadge source={c.source} />
                    </div>
                  </td>
                  <td className="p-3"><StatusBadge s={c.status} /></td>
                  <td className="p-3 hidden lg:table-cell text-slate-500 max-w-xs truncate">{c.fit_reason}</td>
                  <td className="p-3 text-center">{c.contacts_count}</td>
                  <td className="p-3 text-center">{c.sent_count}</td>
                  <td className="p-3 hidden md:table-cell text-slate-400">{fmtDate(c.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
