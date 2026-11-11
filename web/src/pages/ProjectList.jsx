import { Pencil, Plus } from 'lucide-react';
import { useApp } from '../ctx.js';
import { useDock } from '../dock.jsx';
import { api } from '../api.js';
import { ConfirmButton, Empty, Form, McpBadge, PageHead, QuickAdd, StatusBadge } from '../ui.jsx';

export default function ProjectList() {
  const { data, meta, reload } = useApp();
  const dock = useDock();
  const roleOpts = Object.entries(meta?.roles || {}).map(([value, r]) => ({ value, label: r.label }));
  const skillOpts = Object.entries(meta?.skills || {}).map(([value, label]) => ({ value, label }));
  const put = async (p, body) => { await api(`/projects/${p.id}`, { method: 'PUT', body }); reload(); };

  const form = (p) => dock.open(p ? 'Edit project' : 'Add project', (close) => (
    <div>
      <Form initial={p ? { ...p, skills_covered: p.skills_covered || [], milestones_txt: (p.milestones || []).map((m) => m.text).join('\n') } : { skills_covered: [] }} fields={[
        { k: 'title', label: 'Title', required: true },
        { k: 'target_role', label: 'For which role', type: 'select', options: roleOpts },
        { k: 'skills_covered', label: 'Skills it proves', type: 'chips', options: skillOpts },
        { k: 'description', label: 'Description', type: 'textarea', rows: 3 },
        { k: 'milestones_txt', label: 'Milestones (one per line)', type: 'textarea', rows: 4 },
        { k: 'link', label: 'Link (GitHub, write-up)' },
      ]} onSubmit={async (v) => {
        const old = p?.milestones || [];
        const milestones = (v.milestones_txt || '').split('\n').map((t) => t.trim()).filter(Boolean).map((t) => ({ text: t, done: !!old.find((m) => m.text === t)?.done }));
        const body = { title: v.title, target_role: v.target_role || null, description: v.description, link: v.link, milestones, skills_covered: v.skills_covered || [] };
        await api(p ? `/projects/${p.id}` : '/projects', { method: p ? 'PUT' : 'POST', body });
        await reload(); close();
      }} />
      {p && <div className="mt-2"><ConfirmButton onConfirm={async () => { await api(`/items/project/${p.id}`, { method: 'DELETE' }); await reload(); close(); }}>Delete project</ConfirmButton></div>}
    </div>
  ));

  return (
    <div className="space-y-4">
      <PageHead title="Projects" sub="Proof of work that closes your skill gaps. Tick milestones as you go.">
        <button className="btn-outline" onClick={() => form(null)}><Plus size={14} />Add with details</button>
      </PageHead>
      <QuickAdd cta="Add project" hint="Add the idea now. Open it later to pick the skills it proves and write milestones."
        fields={[
          { k: 'title', label: 'Project', required: true, placeholder: 'Credit-risk scorecard', w: 'flex-[2] min-w-[12rem]' },
          { k: 'target_role', label: 'For role', type: 'select', placeholder: 'Any', options: roleOpts, w: 'flex-1 min-w-[10rem]' },
        ]} onAdd={async (v) => { await api('/projects', { method: 'POST', body: { title: v.title, target_role: v.target_role || null, status: 'idea' } }); await reload(); }} />
      {!data.projects.length ? <Empty title="No projects yet">Add one above, or start one from a suggestion on the Skill gaps page.</Empty> : (
        <div className="grid md:grid-cols-2 gap-3">
          {data.projects.map((p) => {
            const ms = p.milestones || []; const done = ms.filter((m) => m.done).length;
            return (
              <div key={p.id} className="card p-4 flex flex-col">
                <div className="flex items-start gap-2"><div className="flex-1 font-medium">{p.title}</div><button className="btn-ghost !p-1" aria-label={`Edit ${p.title}`} onClick={() => form(p)}><Pencil size={13} /></button></div>
                <div className="flex flex-wrap gap-1 mt-1"><StatusBadge s={p.status} /><McpBadge source={p.source} />{(p.skills_covered || []).map((s) => <span key={s} className="chip bg-slate-100 text-slate-600">{meta?.skills?.[s] || s}</span>)}</div>
                {p.description && <p className="text-sm text-slate-600 mt-2">{p.description}</p>}
                <div className="mt-3 space-y-1 flex-1">
                  {ms.map((m, i) => (
                    <label key={i} className="flex items-start gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="mt-0.5" checked={!!m.done} onChange={() => {
                        const next = ms.map((x, j) => (j === i ? { ...x, done: !x.done } : x));
                        put(p, { milestones: next, status: next.every((x) => x.done) ? 'done' : p.status === 'idea' ? 'in_progress' : p.status });
                      }} /><span className={m.done ? 'line-through text-slate-400' : ''}>{m.text}</span>
                    </label>))}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                  {ms.length > 0 && <span>{done}/{ms.length} milestones</span>}
                  <label className="sr-only" htmlFor={`pstatus-${p.id}`}>Status</label>
                  <select id={`pstatus-${p.id}`} className="input !w-auto !py-1 !text-xs ml-auto" value={p.status} onChange={(e) => put(p, { status: e.target.value })}>{['idea', 'in_progress', 'done'].map((s) => <option key={s}>{s}</option>)}</select>
                </div>
              </div>);
          })}
        </div>
      )}
    </div>
  );
}
