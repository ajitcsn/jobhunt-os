import { useState } from 'react';
import { FilePlus2, Pencil, Save, Sparkles } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import { Empty, Form, Modal, PageHead } from '../ui.jsx';

const split = (value = '') => value.split(',').map((x) => x.trim()).filter(Boolean);

export default function CareerAssets() {
  const { data, meta, reload } = useApp();
  const [resume, setResume] = useState(null);
  const [skills, setSkills] = useState((data.profile?.skills || []).join(', '));
  const [saved, setSaved] = useState('');
  const roleOptions = Object.entries(meta?.roles || {}).map(([value, r]) => ({ value, label: r.label }));
  const saveSkills = async () => {
    await api('/profile', { method: 'PUT', body: { skills: split(skills) } });
    await reload(); setSaved('Skills saved.'); setTimeout(() => setSaved(''), 2500);
  };
  return (
    <div className="space-y-7 max-w-6xl">
      <PageHead title="Resumes & skills" sub="Keep role-specific versions and the evidence behind your applications in one place.">
        {saved && <span className="text-sm text-emerald-700 self-center" role="status">{saved}</span>}
        <button className="btn-primary" onClick={() => setResume('new')}><FilePlus2 size={14} />Add resume</button>
      </PageHead>

      <section>
        <div className="flex items-baseline justify-between mb-3"><div><h2 className="font-semibold">Resume library</h2><p className="text-sm text-slate-500">Keep a base resume plus targeted versions. Mark one as your default.</p></div><span className="text-sm text-slate-400">{data.resumes?.length || 0} saved</span></div>
        {!data.resumes?.length ? <Empty icon={FilePlus2} title="No saved resumes yet">Add your first version here; your current profile resume remains available for local ATS checks.</Empty> : (
          <div className="grid md:grid-cols-2 gap-3">{data.resumes.map((r) => <article key={r.id} className="card p-4">
            <div className="flex gap-3"><div className="w-9 h-9 rounded-lg bg-[#e4f1e9] text-[#0f6b4f] grid place-items-center shrink-0"><FilePlus2 size={17} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold truncate">{r.name}</h3>{r.is_default && <span className="chip bg-emerald-100 text-emerald-800">Default</span>}</div><p className="text-xs text-slate-500 mt-0.5">{roleOptions.find((x) => x.value === r.target_role)?.label || 'General version'}</p>{r.summary && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{r.summary}</p>}</div><button className="btn-ghost !p-1" aria-label={`Edit ${r.name}`} onClick={() => setResume(r)}><Pencil size={15} /></button></div>
          </article>)}</div>
        )}
      </section>

      <section className="card p-5">
        <div className="flex items-start gap-3"><div className="w-9 h-9 rounded-lg bg-[#e4f1e9] text-[#0f6b4f] grid place-items-center shrink-0"><Sparkles size={17} /></div><div className="min-w-0 flex-1"><h2 className="font-semibold">Skills inventory</h2><p className="text-sm text-slate-500 mt-0.5">These skills drive your local ATS match and role-gap analysis. Use the words you want recruiters to find.</p>
          <label className="label mt-4" htmlFor="skills-inventory">Skills, separated by commas</label><textarea id="skills-inventory" className="input" rows={3} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="SQL, Python, stakeholder management…" />
          <div className="flex justify-between gap-3 mt-3"><div className="flex flex-wrap gap-1">{split(skills).slice(0, 12).map((skill) => <span key={skill} className="chip bg-slate-100 text-slate-700">{skill}</span>)}</div><button className="btn-primary shrink-0" onClick={saveSkills}><Save size={14} />Save skills</button></div>
        </div></div>
      </section>

      {resume && <Modal title={resume === 'new' ? 'Add resume version' : 'Edit resume version'} onClose={() => setResume(null)}>
        <Form initial={resume === 'new' ? { is_default: !data.resumes?.length } : resume} submitLabel="Save resume" fields={[
          { k: 'name', label: 'Version name', required: true, placeholder: 'Product analyst — fintech' },
          { k: 'target_role', label: 'Target role', type: 'select', options: roleOptions },
          { k: 'summary', label: 'What this version emphasizes', type: 'textarea', rows: 2, placeholder: 'Risk analytics, experimentation & payments…' },
          { k: 'content', label: 'Resume text', type: 'textarea', rows: 9, placeholder: 'Paste the text of this version…' },
          { k: 'is_default', label: 'Make this the default (true or false)' },
        ]} onSubmit={async (v) => { await api(resume === 'new' ? '/resumes' : `/resumes/${resume.id}`, { method: resume === 'new' ? 'POST' : 'PUT', body: { ...v, is_default: String(v.is_default) === 'true' } }); await reload(); setResume(null); }} />
      </Modal>}
    </div>
  );
}
