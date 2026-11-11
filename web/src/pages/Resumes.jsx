import { FilePlus2, Pencil } from 'lucide-react';
import { useApp } from '../ctx.js';
import { useDock } from '../dock.jsx';
import { api } from '../api.js';
import { ConfirmButton, Empty, Form, PageHead, QuickAdd } from '../ui.jsx';

export default function Resumes() {
  const { data, meta, reload } = useApp();
  const dock = useDock();
  const roleOpts = Object.entries(meta?.roles || {}).map(([value, r]) => ({ value, label: r.label }));
  const form = (r) => dock.open(r ? 'Edit resume version' : 'Add resume version', (close) => (
    <div>
      <Form initial={r || { is_default: !data.resumes?.length }} submitLabel="Save resume" fields={[
        { k: 'name', label: 'Version name', required: true, placeholder: 'Product analyst, fintech' },
        { k: 'target_role', label: 'Target role', type: 'select', options: roleOpts },
        { k: 'summary', label: 'What this version emphasizes', type: 'textarea', rows: 2 },
        { k: 'content', label: 'Resume text', type: 'textarea', rows: 12, placeholder: 'Paste the text of this version…' },
        { k: 'is_default', label: 'Default', type: 'checkbox', checkLabel: 'Use as my default resume' },
      ]} onSubmit={async (v) => { await api(r ? `/resumes/${r.id}` : '/resumes', { method: r ? 'PUT' : 'POST', body: { ...v, is_default: !!v.is_default } }); await reload(); close(); }} />
      {r && <div className="mt-2"><ConfirmButton onConfirm={async () => { await api(`/items/resume/${r.id}`, { method: 'DELETE' }); await reload(); close(); }}>Delete version</ConfirmButton></div>}
    </div>
  ));
  return (
    <div className="space-y-4">
      <PageHead title="Resumes" sub="A base resume plus targeted versions. Your default is used for ATS checks." />
      <QuickAdd cta="Add resume" hint="Name it now. Open it to paste the text of this version."
        fields={[
          { k: 'name', label: 'Version name', required: true, placeholder: 'Product analyst, fintech', w: 'flex-[2] min-w-[12rem]' },
          { k: 'target_role', label: 'Target role', type: 'select', placeholder: 'General', options: roleOpts, w: 'flex-1 min-w-[10rem]' },
        ]} onAdd={async (v) => { await api('/resumes', { method: 'POST', body: { name: v.name, target_role: v.target_role || null, is_default: !data.resumes?.length } }); await reload(); }} />
      {!data.resumes?.length ? <Empty icon={FilePlus2} title="No saved resumes yet">Add a version above. The resume on your profile still works for ATS checks.</Empty> : (
        <div className="grid md:grid-cols-2 gap-3">
          {data.resumes.map((r) => (
            <article key={r.id} className="card p-4 flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#e4f1e9] text-[#0f6b4f] grid place-items-center shrink-0"><FilePlus2 size={17} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><h3 className="font-semibold truncate">{r.name}</h3>{r.is_default && <span className="chip bg-emerald-100 text-emerald-800">Default</span>}</div>
                <p className="text-xs text-slate-500 mt-0.5">{roleOpts.find((x) => x.value === r.target_role)?.label || 'General version'}{r.content ? '' : ' · no text yet'}</p>
                {r.summary && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{r.summary}</p>}
              </div>
              <button className="btn-ghost !p-1 self-start" aria-label={`Edit ${r.name}`} onClick={() => form(r)}><Pencil size={15} /></button>
            </article>))}
        </div>
      )}
    </div>
  );
}
