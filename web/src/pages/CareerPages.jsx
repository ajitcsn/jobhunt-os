import { useState } from 'react';
import { Check, ExternalLink, Globe2, Plus } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api, fmtDate } from '../api.js';
import { Empty, Form, Modal, PageHead } from '../ui.jsx';

export default function CareerPages() {
  const { data, reload } = useApp();
  const [adding, setAdding] = useState(false);
  const markChecked = async (page) => { await api(`/career-pages/${page.id}`, { method: 'PUT', body: { ...page, last_checked_on: new Date().toISOString().slice(0, 10) } }); reload(); };
  return <div className="max-w-5xl"><PageHead title="Career pages" sub="A deliberate review queue for the companies you care about—not a noisy job board."><button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} />Track career page</button></PageHead>
    <div className="mb-5 rounded-xl border border-[#cde3d4] bg-[#eef6f0] p-4 text-sm text-[#173d2d]"><b>Weekly habit:</b> review your highest-priority companies’ careers pages, save relevant roles to Applications, and mark each source checked. This catches roles before they get lost in job-board feeds.</div>
    {!data.careerPages?.length ? <Empty icon={Globe2} title="No career pages in your queue">Track the careers pages for your top companies, then return on a weekly cadence.</Empty> : <div className="space-y-2">{data.careerPages.map((p) => <article key={p.id} className="card p-4 flex flex-wrap items-center gap-3"><span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 grid place-items-center"><Globe2 size={17} /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{p.name}</h2><p className="text-sm text-slate-500">{p.company_name ? `${p.company_name} · ` : ''}{p.last_checked_on ? `Checked ${fmtDate(p.last_checked_on)}` : 'Never checked'} · {p.cadence || 'weekly'}</p>{p.notes && <p className="text-sm text-slate-600 mt-1">{p.notes}</p>}</div><div className="flex gap-2"><a className="btn-outline" href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open</a><button className="btn-primary" onClick={() => markChecked(p)}><Check size={14} />Checked</button></div></article>)}</div>}
    {adding && <Modal title="Track a career page" onClose={() => setAdding(false)}><Form submitLabel="Add to review queue" fields={[{ k: 'name', label: 'Company name', required: true, placeholder: 'Razorpay' }, { k: 'url', label: 'Career-page URL', required: true, type: 'url', placeholder: 'https://company.com/careers' }, { k: 'cadence', label: 'Review cadence', type: 'select', required: true, options: ['weekly', 'biweekly', 'monthly'] }, { k: 'notes', label: 'What you are watching for', type: 'textarea', rows: 2, placeholder: 'Product analytics & risk roles…' }]} initial={{ cadence: 'weekly' }} onSubmit={async (v) => { await api('/career-pages', { method: 'POST', body: { ...v, company: v.name } }); await reload(); setAdding(false); }} /></Modal>}
  </div>;
}
