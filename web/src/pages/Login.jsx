import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, Inbox, FolderKanban } from 'lucide-react';
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
      <div className="bg-indigo-700 text-white p-8 md:p-14 flex flex-col justify-center">
        <div className="font-bold text-xl flex items-center gap-2 mb-8"><span className="w-8 h-8 rounded-lg bg-white text-indigo-700 grid place-items-center">J</span>JobHunt OS</div>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight">Your Claude does the research and writing.<br />We keep your job hunt moving.</h1>
        <p className="mt-4 text-indigo-100 max-w-md">Connect your own Claude. Ask it to find companies, contacts and openings. Everything lands here, ready to edit, send and track. No AI bill inside.</p>
        <div className="mt-8 space-y-3 text-sm text-indigo-100">
          <p className="flex gap-2"><Send size={18} /> Outbound: companies → research → contacts → drafts → follow-ups</p>
          <p className="flex gap-2"><Inbox size={18} /> Inbound: openings and applications with a local ATS score</p>
          <p className="flex gap-2"><FolderKanban size={18} /> Projects: skill gaps for your target role, and projects that close them</p>
          <p className="flex gap-2"><Sparkles size={18} /> Today: one list of what to do next, across all three</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-xl font-semibold">{mode === 'login' ? 'Log in' : 'Create your account'}</h2>
          {mode === 'signup' && <div><label className="label">Name</label><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>}
          <div><label className="label">Email</label><input className="input" type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          <div><label className="label">Password</label><input className="input" type="password" required value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <button className="btn-primary w-full justify-center py-2">{mode === 'login' ? 'Log in' : 'Sign up'}</button>
          <p className="text-sm text-slate-500 text-center">
            {mode === 'login' ? 'New here? ' : 'Have an account? '}
            <button type="button" className="text-indigo-600 font-medium" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Sign up' : 'Log in'}</button>
          </p>
          <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
            Demo account: <b>demo@jobhunt.app</b> / <b>volopay2026</b>
            <button type="button" className="ml-2 text-indigo-600 font-medium" onClick={() => setV({ ...v, email: 'demo@jobhunt.app', password: 'volopay2026' })}>Fill</button>
          </div>
        </form>
      </div>
    </div>
  );
}
