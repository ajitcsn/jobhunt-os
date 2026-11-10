import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Target, Trash2, Pencil } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import { PageHead, Modal, Form, StatusBadge, McpBadge, Empty } from '../ui.jsx';

function GapCard({ g, onCreate }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{g.label}</h3>
        <span className="text-sm"><b className="text-lg">{g.readiness}%</b> <span className="text-slate-500">ready</span></span>
      </div>
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

export default function Projects() {
  const { data, meta, reload } = useApp();
  const [modal, setModal] = useState(null);
  const put = async (p, body) => { await api(`/projects/${p.id}`, { method: 'PUT', body }); reload(); };
  const create = async (role, tpl) => {
    await api('/projects', { method: 'POST', body: { title: tpl.title, target_role: role, skills_covered: tpl.covers, milestones: tpl.milestones, status: 'idea' } });
    reload();
  };
  const roleOpts = Object.entries(meta?.roles || {}).map(([k, v]) => ({ value: k, label: v.label }));

  return (
    <div>
      <PageHead title="Career assets" sub="Build the proof of work that closes your most important skill gaps.">
        <button className="btn-primary" onClick={() => setModal('new')}><Plus size={14} />Add project</button>
      </PageHead>

      {!data.gaps.length ? (
        <Empty icon={Target} title="Pick a target role first"><Link className="text-[#0f6b4f]" to="/profile">Set target roles in your profile</Link> to see your gaps.</Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-8">{data.gaps.map((g) => <GapCard key={g.role} g={g} onCreate={create} />)}</div>
      )}

      <h2 className="font-semibold mb-3">Your projects</h2>
      {!data.projects.length ? <Empty title="No projects yet">Start one from a gap above or add your own proof-of-work project.</Empty> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.projects.map((p) => {
            const ms = p.milestones || [];
            const done = ms.filter((m) => m.done).length;
            return (
              <div key={p.id} className="card p-4 flex flex-col">
                <div className="flex items-start gap-2">
                  <div className="flex-1 font-medium">{p.title}</div>
                  <button className="btn-ghost !p-1" onClick={() => setModal(p)}><Pencil size={13} /></button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <StatusBadge s={p.status} /><McpBadge source={p.source} />
                  {(p.skills_covered || []).map((s) => <span key={s} className="chip bg-slate-100 text-slate-600">{meta?.skills?.[s] || s}</span>)}
                </div>
                {p.description && <p className="text-sm text-slate-600 mt-2">{p.description}</p>}
                <div className="mt-3 space-y-1 flex-1">
                  {ms.map((m, i) => (
                    <label key={i} className="flex items-start gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="mt-0.5" checked={!!m.done} onChange={() => {
                        const next = ms.map((x, j) => (j === i ? { ...x, done: !x.done } : x));
                        const allDone = next.every((x) => x.done);
                        put(p, { milestones: next, status: allDone ? 'done' : p.status === 'idea' ? 'in_progress' : p.status });
                      }} />
                      <span className={m.done ? 'line-through text-slate-400' : ''}>{m.text}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                  {ms.length > 0 && <span>{done}/{ms.length} milestones</span>}
                  <select className="input !w-auto !py-1 !text-xs ml-auto" value={p.status} onChange={(e) => put(p, { status: e.target.value })}>
                    {['idea', 'in_progress', 'done'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'new' ? 'Add project' : 'Edit project'} onClose={() => setModal(null)}>
          <Form
            fields={[
              { k: 'title', label: 'Title', required: true },
              { k: 'target_role', label: 'For which role', type: 'select', options: roleOpts },
              { k: 'skills_csv', label: 'Skills it proves (comma separated keys: ' + Object.keys(meta?.skills || {}).join(', ') + ')' },
              { k: 'description', label: 'Description', type: 'textarea', rows: 3 },
              { k: 'milestones_txt', label: 'Milestones (one per line)', type: 'textarea', rows: 4 },
              { k: 'link', label: 'Link (GitHub, write-up)' },
            ]}
            initial={modal === 'new' ? {} : { ...modal, skills_csv: (modal.skills_covered || []).join(', '), milestones_txt: (modal.milestones || []).map((m) => m.text).join('\n') }}
            onSubmit={async (v) => {
              const old = modal === 'new' ? [] : modal.milestones || [];
              const milestones = (v.milestones_txt || '').split('\n').map((t) => t.trim()).filter(Boolean)
                .map((t) => ({ text: t, done: !!old.find((m) => m.text === t)?.done }));
              const skills_covered = (v.skills_csv || '').split(',').map((s) => s.trim()).filter((s) => meta?.skills?.[s]);
              const body = { title: v.title, target_role: v.target_role || null, description: v.description, link: v.link, milestones, skills_covered };
              if (modal === 'new') await api('/projects', { method: 'POST', body }); else await api(`/projects/${modal.id}`, { method: 'PUT', body });
              await reload(); setModal(null);
            }} />
          {modal !== 'new' && <button className="btn-ghost !text-slate-400 mt-2" onClick={async () => { await api(`/items/project/${modal.id}`, { method: 'DELETE' }); reload(); setModal(null); }}><Trash2 size={14} />Delete</button>}
        </Modal>
      )}
    </div>
  );
}
