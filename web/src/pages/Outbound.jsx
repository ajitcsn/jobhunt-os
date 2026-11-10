import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api, fmtDate } from '../api.js';
import { PageHead, Modal, Form, StatusBadge, ClaudeBadge, Empty, ClaudePrompt } from '../ui.jsx';

export const COMPANY_FIELDS = [
  { k: 'name', label: 'Company name', required: true },
  { k: 'website', label: 'Website' },
  { k: 'sector', label: 'Sector' },
  { k: 'stage', label: 'Stage' },
  { k: 'location', label: 'Location' },
  { k: 'fit_reason', label: 'Why it fits you', type: 'textarea', rows: 2 },
  { k: 'priority', label: 'Priority', type: 'select', required: true, options: [{ value: 1, label: '1 · Top fit' }, { value: 2, label: '2 · Good fit' }, { value: 3, label: '3 · Stretch' }] },
];

const FILTERS = ['all', 'shortlisted', 'researched', 'contacted', 'archived'];

export default function Outbound() {
  const { data, reload } = useApp();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('all');
  const nav = useNavigate();
  const rows = data.companies.filter((c) => (filter === 'all' ? c.status !== 'archived' : c.status === filter));
  const pending = data.drafts.filter((d) => d.status === 'draft').length;
  const replied = data.drafts.filter((d) => d.status === 'replied').length;

  return (
    <div>
      <PageHead title="Outbound" sub={`${data.companies.length} companies · ${data.contacts.length} contacts · ${pending} drafts to send · ${replied} replies`}>
        <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} />Add company</button>
      </PageHead>

      <div className="mb-4"><ClaudePrompt text="Using JobHunt, find 5 Bengaluru fintech companies that fit my profile and are hiring, research the best one, find 3 contacts there (HR, alumni, leader) and draft outreach for each." /></div>

      <div className="flex gap-1 mb-3 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`btn !py-1 capitalize ${filter === f ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{f}</button>
        ))}
      </div>

      {!rows.length ? (
        <Empty icon={Building2} title="No companies yet">Add one yourself, or paste the prompt above into Claude.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500 border-b border-slate-100">
              <tr><th className="p-3">Company</th><th className="p-3">Status</th><th className="p-3 hidden md:table-cell">Why it fits</th><th className="p-3 text-center">Contacts</th><th className="p-3 text-center">Sent</th><th className="p-3 hidden md:table-cell">Updated</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => nav(`/outbound/companies/${c.id}`)}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-6 rounded ${c.priority === 1 ? 'bg-indigo-500' : c.priority === 2 ? 'bg-indigo-200' : 'bg-slate-200'}`} />
                      <div>
                        <Link to={`/outbound/companies/${c.id}`} className="font-medium text-slate-900">{c.name}</Link>
                        <div className="text-xs text-slate-400">{[c.sector, c.stage, c.location].filter(Boolean).join(' · ')}</div>
                      </div>
                      <ClaudeBadge source={c.source} />
                    </div>
                  </td>
                  <td className="p-3"><StatusBadge s={c.status} /></td>
                  <td className="p-3 hidden md:table-cell text-slate-500 max-w-xs truncate">{c.fit_reason}</td>
                  <td className="p-3 text-center">{c.contacts_count}</td>
                  <td className="p-3 text-center">{c.sent_count}</td>
                  <td className="p-3 hidden md:table-cell text-slate-400">{fmtDate(c.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <Modal title="Add company" onClose={() => setAdding(false)}>
          <Form fields={COMPANY_FIELDS} initial={{ priority: 2 }} onSubmit={async (v) => {
            const c = await api('/companies', { method: 'POST', body: v });
            await reload(); setAdding(false); nav(`/outbound/companies/${c.id}`);
          }} />
        </Modal>
      )}
    </div>
  );
}
