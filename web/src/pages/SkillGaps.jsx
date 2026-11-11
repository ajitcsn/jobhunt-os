import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Save, Target, X } from 'lucide-react';
import { useApp } from '../ctx.js';
import { api } from '../api.js';
import { Empty, PageHead } from '../ui.jsx';

function GapCard({ g, onCreate }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between"><h3 className="font-semibold">{g.label}</h3><span className="text-sm"><b className="text-lg">{g.readiness}%</b> <span className="text-slate-500">ready</span></span></div>
      <div className="h-2 bg-slate-100 rounded-full mt-2 mb-4"><div className="h-2 rounded-full bg-[#0f6b4f]" style={{ width: g.readiness + '%' }} /></div>
      <div className="space-y-1.5">
        {g.skills.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <span className="w-40 truncate text-slate-600">{s.label}</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full"><div className={`h-1.5 rounded-full ${s.coverage >= 1 ? 'bg-emerald-500' : s.coverage > 0 ? 'bg-amber-400' : 'bg-rose-300'}`} style={{ width: Math.max(4, s.coverage * 100) + '%' }} /></div>
            <span className="text-xs text-slate-400 w-14 text-right">{s.coverage >= 1 ? 'covered' : s.coverage > 0 ? 'partial' : 'gap'}</span>
          </div>
        ))}
      </div>
      {g.suggestions.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="label">Projects that close these gaps</div>
          {g.suggestions.map((p) => (
            <div key={p.title} className="flex items-center gap-2 py-1.5">
              <div className="flex-1 text-sm"><div className="font-medium">{p.title}</div><div className="text-xs text-slate-500">Closes: {p.closes.join(', ')}</div></div>
              <button className="btn-outline !py-1" onClick={() => onCreate(g.role, p)}><Plus size={13} />Start</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Skills({ skills, onSave }) {
  const [list, setList] = useState(skills);
  const [text, setText] = useState('');
  const dirty = JSON.stringify(list) !== JSON.stringify(skills);
  const add = () => { const n = text.split(',').map((x) => x.trim()).filter((x) => x && !list.includes(x)); if (n.length) setList([...list, ...n]); setText(''); };
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Skills inventory</h2>
      <p className="text-sm text-slate-500 mt-0.5">These skills drive your ATS match and the gap analysis below. Use the words recruiters search for.</p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {list.map((s) => <span key={s} className="chip bg-slate-100 text-slate-700 !pr-1">{s}<button className="ml-1 p-0.5 rounded hover:bg-slate-200" aria-label={`Remove ${s}`} onClick={() => setList(list.filter((x) => x !== s))}><X size={11} /></button></span>)}
        {!list.length && <span className="text-sm text-slate-400">No skills yet.</span>}
      </div>
      <form className="flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label className="sr-only" htmlFor="skill-add">Add skills</label>
        <input id="skill-add" className="input" placeholder="Add skills, separated by commas" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-outline"><Plus size={14} />Add</button>
        {dirty && <button type="button" className="btn-primary" onClick={() => onSave(list)}><Save size={14} />Save</button>}
      </form>
    </section>
  );
}

export default function SkillGaps() {
  const { data, reload } = useApp();
  const create = async (role, tpl) => { await api('/projects', { method: 'POST', body: { title: tpl.title, target_role: role, skills_covered: tpl.covers, milestones: tpl.milestones, status: 'idea' } }); reload(); };
  return (
    <div className="space-y-5">
      <PageHead title="Skill gaps" sub="What your target roles ask for, what your resume shows, and projects that close the difference." />
      <Skills key={(data.profile?.skills || []).join('|')} skills={data.profile?.skills || []} onSave={async (skills) => { await api('/profile', { method: 'PUT', body: { skills } }); reload(); }} />
      {!data.gaps.length
        ? <Empty icon={Target} title="Pick a target role first"><Link className="text-[#0f6b4f]" to="/setup/profile">Set target roles in your profile</Link> to see your gaps.</Empty>
        : <div className="grid lg:grid-cols-2 gap-4">{data.gaps.map((g) => <GapCard key={g.role} g={g} onCreate={create} />)}</div>}
    </div>
  );
}
