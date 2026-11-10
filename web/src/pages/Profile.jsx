import { useEffect, useState } from 'react';
import { Upload, Save } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import { PageHead, ClaudePrompt } from '../ui.jsx';

const csv = (a) => (a || []).join(', ');
const arr = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

export default function Profile() {
  const { data, meta, reload } = useApp();
  const p = data.profile || {};
  const [v, setV] = useState({});
  const [msg, setMsg] = useState('');
  useEffect(() => setV({
    ...p, target_locations: csv(p.target_locations), target_company_types: csv(p.target_company_types), skills: csv(p.skills),
  }), [data.profile]);

  const toggleRole = (k) => {
    const cur = v.target_roles || [];
    setV({ ...v, target_roles: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] });
  };
  const save = async () => {
    await api('/profile', { method: 'PUT', body: {
      headline: v.headline, location: v.location, years_exp: v.years_exp === '' ? null : v.years_exp, education: v.education, college: v.college,
      target_roles: v.target_roles || [], target_locations: arr(v.target_locations), target_company_types: arr(v.target_company_types), skills: arr(v.skills),
      weekly_outreach_target: Number(v.weekly_outreach_target) || 10, weekly_applications_target: Number(v.weekly_applications_target) || 5,
      resume_text: v.resume_text || '', onboarded: true,
    } });
    await reload(); setMsg('Saved. Gaps and ATS scores updated.'); setTimeout(() => setMsg(''), 3000);
  };
  const upload = async (file) => {
    const form = new FormData(); form.append('file', file);
    try { await api('/profile/resume-pdf', { method: 'POST', form }); await reload(); setMsg('Résumé text extracted from PDF.'); }
    catch (e) { setMsg(e.message); }
  };
  const field = (k, label, props = {}) => (
    <div><label className="label">{label}</label><input className="input" value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...props} /></div>
  );

  return (
    <div>
      <PageHead title="Profile" sub="Your direction. Everything else (gaps, ATS, Today, Claude's drafts) is built on this.">
        {msg && <span className="text-sm text-emerald-600 self-center">{msg}</span>}
        <button className="btn-primary" onClick={save}><Save size={14} />Save profile</button>
      </PageHead>
      {!p.resume_text && <div className="mb-4"><ClaudePrompt text="Here's my résumé (attached). Read it and fill in my JobHunt profile: headline, college, skills, and the target roles that fit me best." /></div>}

      <div className="grid md:grid-cols-2 gap-5">
        <section className="card p-5 space-y-4">
          <h2 className="font-semibold">1. Where are you headed?</h2>
          <div>
            <div className="label">Target roles (pick 1–3)</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(meta?.roles || {}).map(([k, r]) => {
                const on = (v.target_roles || []).includes(k);
                return <button key={k} onClick={() => toggleRole(k)} className={`chip !px-3 !py-1 border ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'}`}>{r.label}</button>;
              })}
            </div>
          </div>
          {field('target_locations', 'Locations (comma separated)', { placeholder: 'Bengaluru, Remote' })}
          {field('target_company_types', 'Company types', { placeholder: 'fintech, Series A–D startup' })}
          <div className="grid grid-cols-2 gap-3">
            {field('weekly_outreach_target', 'Outreach per week', { type: 'number' })}
            {field('weekly_applications_target', 'Applications per week', { type: 'number' })}
          </div>
        </section>

        <section className="card p-5 space-y-4">
          <h2 className="font-semibold">2. Who are you?</h2>
          {field('headline', 'Headline', { placeholder: 'Risk analyst moving into product' })}
          <div className="grid grid-cols-2 gap-3">
            {field('location', 'Based in')}
            {field('years_exp', 'Years of experience', { type: 'number', step: '0.5' })}
          </div>
          {field('college', 'College (used to find alumni)')}
          {field('education', 'Degree')}
          {field('skills', 'Skills (comma separated)')}
        </section>

        <section className="card p-5 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="font-semibold">3. Résumé</h2>
            <label className="btn-outline cursor-pointer"><Upload size={14} />Upload PDF<input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files[0] && upload(e.target.files[0])} /></label>
          </div>
          <p className="text-xs text-slate-500 mb-2">Plain text is enough. We use it for the ATS score, the gap analysis, and as context for Claude's drafts.</p>
          <textarea className="input font-mono text-xs" rows={16} value={v.resume_text || ''} onChange={(e) => setV({ ...v, resume_text: e.target.value })} placeholder="Paste your résumé text here…" />
        </section>
      </div>
    </div>
  );
}
