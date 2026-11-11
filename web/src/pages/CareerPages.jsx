import { Check, ExternalLink, Globe2 } from 'lucide-react';
import { useApp } from '../ctx.js';
import { api, fmtDate } from '../api.js';
import { ConfirmButton, Empty, PageHead, QuickAdd } from '../ui.jsx';

export default function CareerPages() {
  const { data, reload } = useApp();
  const markChecked = async (p) => { await api(`/career-pages/${p.id}`, { method: 'PUT', body: { ...p, last_checked_on: new Date().toISOString().slice(0, 10) } }); reload(); };
  return (
    <div className="space-y-4">
      <PageHead title="Career pages" sub="A weekly review queue for the companies you care about, not a noisy job board." />
      <QuickAdd cta="Track page" hint="Weekly habit: open each page, save relevant roles to the Pipeline, then press Checked."
        fields={[
          { k: 'name', label: 'Company', required: true, placeholder: 'Razorpay', w: 'flex-1 min-w-[10rem]' },
          { k: 'url', label: 'Careers URL', required: true, type: 'url', placeholder: 'https://company.com/careers', w: 'flex-[2] min-w-[12rem]' },
          { k: 'cadence', label: 'Review', type: 'select', default: 'weekly', blank: false, w: 'w-36', options: ['weekly', 'biweekly', 'monthly'] },
        ]} onAdd={async (v) => { await api('/career-pages', { method: 'POST', body: { ...v, company: v.name } }); await reload(); }} />
      {!data.careerPages?.length ? <Empty icon={Globe2} title="No career pages in your queue">Track the careers pages of your top companies, then come back weekly.</Empty> : (
        <div className="space-y-2">
          {data.careerPages.map((p) => (
            <article key={p.id} className="card p-4 flex flex-wrap items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 grid place-items-center"><Globe2 size={17} /></span>
              <div className="min-w-0 flex-1"><h2 className="font-semibold">{p.name}</h2>
                <p className="text-sm text-slate-500">{p.company_name ? `${p.company_name} · ` : ''}{p.last_checked_on ? `Checked ${fmtDate(p.last_checked_on)}` : 'Never checked'} · {p.cadence || 'weekly'}</p>
                {p.notes && <p className="text-sm text-slate-600 mt-1">{p.notes}</p>}</div>
              <div className="flex gap-2 items-center">
                <a className="btn-outline" href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open</a>
                <button className="btn-primary" onClick={() => markChecked(p)}><Check size={14} />Checked</button>
                <ConfirmButton onConfirm={async () => { await api(`/items/career_page/${p.id}`, { method: 'DELETE' }); reload(); }}>Delete</ConfirmButton>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
