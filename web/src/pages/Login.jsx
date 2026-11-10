import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cable, Send, BriefcaseBusiness, FolderKanban } from 'lucide-react';
import { api, auth } from '../api.js';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [v, setV] = useState({ email: '', password: '', name: '' });
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const r = await api(`/auth/${mode}`, { method: 'POST', body: v });
      auth.save(r.token);
      nav(mode === 'signup' ? '/profile' : '/');
    } catch (x) { setErr(x.message); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="bg-[#143d30] text-white p-8 md:p-14 flex flex-col justify-center">
        <div className="font-bold text-xl flex items-center gap-2 mb-8"><span className="w-8 h-8 rounded-lg bg-white text-[#0f6b4f] grid place-items-center">J</span>JobHunt OS</div>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">Research smarter. Follow through better.</h1>
        <p className="mt-4 text-emerald-50/80 max-w-md">Your connected assistant researches and writes. JobHunt keeps each company, contact, application, and follow-up in a system you control.</p>
        <div className="mt-8 space-y-3 text-sm text-emerald-50/80">
          <p className="flex gap-2"><Send size={18} /> Companies: research → contacts → drafts → follow-ups</p>
          <p className="flex gap-2"><BriefcaseBusiness size={18} /> Applications: a deliberate pipeline with a local ATS score</p>
          <p className="flex gap-2"><FolderKanban size={18} /> Career assets: skill gaps for your target role, and projects that close them</p>
          <p className="flex gap-2"><Cable size={18} /> Command center: one list of what to do next, across every track</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-xl font-semibold">{mode === 'login' ? 'Log in' : 'Create your account'}</h2>
          {mode === 'signup' && <div><label className="label" htmlFor="signup-name">Name</label><input id="signup-name" name="name" autoComplete="name" className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>}
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" autoComplete="email" spellCheck="false" className="input" type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="input" type="password" required value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <button className="btn-primary w-full justify-center py-2">{mode === 'login' ? 'Log in' : 'Sign up'}</button>
          <p className="text-sm text-slate-500 text-center">
            {mode === 'login' ? 'New here? ' : 'Have an account? '}
            <button type="button" className="text-[#0f6b4f] font-medium" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Sign up' : 'Log in'}</button>
          </p>
          <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
            Demo account: <b>demo@jobhunt.app</b> / <b>volopay2026</b>
            <button type="button" className="ml-2 text-[#0f6b4f] font-medium" onClick={() => setV({ ...v, email: 'demo@jobhunt.app', password: 'volopay2026' })}>Fill</button>
          </div>
        </form>
      </div>
    </div>
  );
}
