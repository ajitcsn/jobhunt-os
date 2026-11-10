import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, BriefcaseBusiness, FileText, Compass, Send, User, Plug, LogOut, Cable } from 'lucide-react';
import { api, auth } from './api.js';
import Login from './pages/Login.jsx';
import Today from './pages/Today.jsx';
import Outbound from './pages/Outbound.jsx';
import Company from './pages/Company.jsx';
import Applications from './pages/Inbound.jsx';
import Projects from './pages/Projects.jsx';
import CareerAssets from './pages/CareerAssets.jsx';
import CareerPages from './pages/CareerPages.jsx';
import Drafts from './pages/Drafts.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

function Shell() {
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [tick, setTick] = useState(0);
  const lastId = useRef(null);
  const nav = useNavigate();

  const reload = useCallback(async () => setData(await api('/overview')), []);

  useEffect(() => {
    api('/me').then(setMe);
    api('/meta').then(setMeta);
    reload();
  }, [reload]);

  // Keep MCP-created records visible while the connected conversation is working.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const rows = await api(`/activity?since=${lastId.current ?? 0}`);
        if (lastId.current === null) { lastId.current = rows[0]?.id || 0; return; }
        if (rows.length) {
          lastId.current = rows[0].id;
          const fromClaude = rows.filter((r) => r.source === 'claude');
          if (fromClaude.length) {
            const byType = {};
            fromClaude.forEach((r) => (byType[r.entity_type] = (byType[r.entity_type] || 0) + 1));
            const msg = Object.entries(byType).map(([t, n]) => `${n} ${n > 1 ? ({ company: 'companies', research: 'research', profile: 'profile' }[t] || t + 's') : t}`).join(', ');
            const id = Date.now();
            setToasts((t) => [...t, { id, msg: `Your connected assistant updated ${msg}` }]);
            setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
          }
          await reload();
          setTick((x) => x + 1);
        }
      } catch { /* offline blip */ }
    };
    poll();
    const iv = setInterval(() => alive && poll(), 3000);
    return () => { alive = false; clearInterval(iv); };
  }, [reload]);

  const nItems = data?.today?.items?.length;
  const links = [
    { to: '/', label: 'Command center', icon: LayoutDashboard, badge: nItems },
    { to: '/outbound', label: 'Companies', icon: Building2 },
    { to: '/applications', label: 'Applications', icon: BriefcaseBusiness },
    { to: '/assets', label: 'Resumes & skills', icon: FileText },
    { to: '/career-pages', label: 'Career pages', icon: Compass },
    { to: '/drafts', label: 'Drafts', icon: Send },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/settings', label: 'Connect MCP', icon: Plug },
  ];

  return (
    <Ctx.Provider value={{ me, data, meta, reload, tick }}>
      <div className="min-h-screen md:flex">
        <aside className="md:w-56 md:min-h-screen bg-white border-b md:border-b-0 md:border-r border-slate-200 md:sticky md:top-0 md:h-screen flex md:flex-col">
          <div className="px-4 py-4 hidden md:block">
            <div className="font-bold text-[#17211d] flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-[#0f6b4f] text-white grid place-items-center text-sm">J</span>JobHunt OS</div>
            <p className="text-[11px] text-slate-400 mt-1">Your job-search operating system</p>
          </div>
          <nav className="flex md:flex-col gap-0.5 px-2 py-2 overflow-x-auto flex-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b4f] ${isActive ? 'bg-[#e4f1e9] text-[#0d6046] font-semibold' : 'text-slate-600 hover:bg-[#eef3ee]'}`}>
                <l.icon size={16} />{l.label}
                {!!l.badge && <span className="ml-auto chip bg-[#0f6b4f] text-white">{l.badge}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:block p-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="truncate">{me?.email}</div>
            <button className="btn-ghost !px-0 mt-1" onClick={() => { auth.clear(); nav('/login'); }}><LogOut size={14} />Log out</button>
          </div>
        </aside>
        <main id="main-content" className="flex-1 min-w-0 p-4 md:p-8 max-w-7xl">
          {!data ? <p className="text-slate-400">Loading…</p> : (
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/outbound" element={<Outbound />} />
              <Route path="/outbound/companies/:id" element={<Company />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/inbound" element={<Navigate to="/applications" replace />} />
              <Route path="/assets" element={<CareerAssets />} />
              <Route path="/career-pages" element={<CareerPages />} />
              <Route path="/drafts" element={<Drafts />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
        </main>
      </div>
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} role="status" aria-live="polite" className="card shadow-lg px-4 py-3 text-sm flex items-center gap-2 border-[#bcd9c6] bg-[#eef6f0] text-[#173d2d]">
            <Cable size={16} className="text-[#0f6b4f]" aria-hidden="true" />{t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={auth.token() ? <Shell /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
