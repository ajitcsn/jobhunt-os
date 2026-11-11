import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, BriefcaseBusiness, FolderKanban, Send, UsersRound, MessageSquareText, Settings2, LogOut, Cable, ChevronDown, ChevronRight } from 'lucide-react';
import { api, auth } from './api.js';
import { Ctx } from './ctx.js';
import { DockProvider, DockPanel, useDock } from './dock.jsx';
import { LogoMark } from './ui.jsx';
import Rail from './Rail.jsx';
import Login from './pages/Login.jsx';
import Today from './pages/Today.jsx';
import Companies from './pages/Companies.jsx';
import Company from './pages/Company.jsx';
import Contacts from './pages/Contacts.jsx';
import Templates from './pages/Templates.jsx';
import Applications from './pages/Applications.jsx';
import CareerPages from './pages/CareerPages.jsx';
import SkillGaps from './pages/SkillGaps.jsx';
import ProjectList from './pages/ProjectList.jsx';
import Resumes from './pages/Resumes.jsx';
import Profile from './pages/Profile.jsx';
import Connect from './pages/Connect.jsx';

// Three tracks, each with its own sub-pages. Sub-pages show indented under the active track.
const NAV = [
  { key: 'outbound', label: 'Outbound', icon: Send, base: '/outbound', children: [
    { to: '/outbound/companies', label: 'Companies', icon: Building2 },
    { to: '/outbound/contacts', label: 'Contacts', icon: UsersRound },
    { to: '/outbound/templates', label: 'Templates', icon: MessageSquareText },
  ] },
  { key: 'applications', label: 'Applications', icon: BriefcaseBusiness, base: '/applications', children: [
    { to: '/applications', label: 'Pipeline', end: true },
    { to: '/applications/career-pages', label: 'Career pages' },
  ] },
  { key: 'projects', label: 'Projects', icon: FolderKanban, base: '/projects', children: [
    { to: '/projects', label: 'Skill gaps', end: true },
    { to: '/projects/list', label: 'Projects' },
    { to: '/projects/resumes', label: 'Resumes' },
  ] },
  { key: 'setup', label: 'Setup', icon: Settings2, base: '/setup', children: [
    { to: '/setup/profile', label: 'Profile' },
    { to: '/setup/connect', label: 'Connect Claude' },
  ] },
];

const linkCls = (active) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b4f] ${active ? 'bg-[#e4f1e9] text-[#0d6046] font-semibold' : 'text-slate-600 hover:bg-[#eef3ee]'}`;

function Sidebar({ me, nItems, onLogout }) {
  const { pathname } = useLocation();
  const activeGroup = NAV.find((g) => pathname.startsWith(g.base));
  return (
    <aside className="hidden md:flex md:w-60 shrink-0 md:min-h-screen bg-white border-r border-[#dce3dc] sticky top-0 h-screen flex-col">
      <div className="px-4 py-4 flex items-center gap-2.5">
        <LogoMark size={32} />
        <div><div className="font-bold text-[#17211d] leading-tight">JobHunt OS</div><p className="text-[11px] text-slate-400 leading-tight">Your job-search operating system</p></div>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 py-2 flex-1 overflow-y-auto" aria-label="Main">
        <NavLink to="/" end className={({ isActive }) => linkCls(isActive)}>
          <LayoutDashboard size={16} />Command center
          {!!nItems && <span className="ml-auto chip bg-[#0f6b4f] text-white">{nItems}</span>}
        </NavLink>
        {NAV.map((g) => {
          const open = activeGroup?.key === g.key;
          return (
            <div key={g.key} className="mt-1">
              <Link to={g.children[0].to} aria-expanded={open} className={linkCls(open) + (open ? ' !bg-transparent' : '')}>
                <g.icon size={16} />{g.label}
                {open ? <ChevronDown size={14} className="ml-auto text-slate-400" /> : <ChevronRight size={14} className="ml-auto text-slate-300" />}
              </Link>
              {open && (
                <div className="ml-[1.1rem] pl-2 border-l border-[#dce3dc] mt-0.5 space-y-0.5">
                  {g.children.map((c) => (
                    <NavLink key={c.to} to={c.to} end={c.end} className={({ isActive }) => `block px-3 py-1.5 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b4f] ${isActive ? 'bg-[#e4f1e9] text-[#0d6046] font-semibold' : 'text-slate-600 hover:bg-[#eef3ee]'}`}>{c.label}</NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="truncate">{me?.email}</div>
        <button className="btn-ghost !px-0 mt-1" onClick={onLogout}><LogOut size={14} />Log out</button>
      </div>
    </aside>
  );
}

function MobileNav({ nItems, onLogout }) {
  const { pathname } = useLocation();
  const activeGroup = NAV.find((g) => pathname.startsWith(g.base));
  return (
    <header className="md:hidden bg-white border-b border-[#dce3dc]">
      <div className="flex items-center gap-2 px-3 pt-3">
        <LogoMark size={26} /><span className="font-bold">JobHunt OS</span>
        <button className="btn-ghost ml-auto !p-1.5" aria-label="Log out" onClick={onLogout}><LogOut size={16} /></button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 py-2" aria-label="Main">
        <NavLink to="/" end className={({ isActive }) => linkCls(isActive)}>Command{!!nItems && <span className="chip bg-[#0f6b4f] text-white">{nItems}</span>}</NavLink>
        {NAV.map((g) => <Link key={g.key} to={g.children[0].to} className={linkCls(activeGroup?.key === g.key)}>{g.label}</Link>)}
      </nav>
      {activeGroup && (
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 border-t border-[#eef3ee] pt-2" aria-label={activeGroup.label}>
          {activeGroup.children.map((c) => <NavLink key={c.to} to={c.to} end={c.end} className={({ isActive }) => `px-3 py-1 rounded-full text-sm whitespace-nowrap border ${isActive ? 'bg-[#0f6b4f] text-white border-[#0f6b4f]' : 'text-slate-600 border-slate-200'}`}>{c.label}</NavLink>)}
        </nav>
      )}
    </header>
  );
}

function RightColumn() {
  const { panel } = useDock();
  // xl: always a sticky right column (rail or panel). Below xl: only the panel, shown above the page.
  return (
    <aside className={`${panel ? 'block order-first px-4 pt-4 md:px-8' : 'hidden'} xl:block xl:order-last xl:w-[22rem] xl:shrink-0 xl:p-6 xl:pl-0 xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto`}>
      {panel ? <DockPanel /> : <Rail />}
    </aside>
  );
}

function Shell() {
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [tick, setTick] = useState(0);
  const lastId = useRef(null);
  const nav = useNavigate();

  const reload = useCallback(async () => setData(await api('/overview')), []);
  const logout = () => { auth.clear(); nav('/login'); };

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

  return (
    <Ctx.Provider value={{ me, data, meta, reload, tick }}>
      <DockProvider>
        <div className="min-h-screen md:flex">
          <Sidebar me={me} nItems={nItems} onLogout={logout} />
          <div className="flex-1 min-w-0">
            <MobileNav nItems={nItems} onLogout={logout} />
            <div className="flex flex-col xl:flex-row">
              <main id="main-content" className="flex-1 min-w-0 p-4 md:p-8 xl:pr-6 max-w-[64rem]">
                {!data ? <p className="text-slate-400">Loading…</p> : (
                  <Routes>
                    <Route path="/" element={<Today />} />
                    <Route path="/outbound" element={<Navigate to="/outbound/companies" replace />} />
                    <Route path="/outbound/companies" element={<Companies />} />
                    <Route path="/outbound/companies/:id" element={<Company />} />
                    <Route path="/outbound/contacts" element={<Contacts />} />
                    <Route path="/outbound/templates" element={<Templates />} />
                    <Route path="/applications" element={<Applications />} />
                    <Route path="/applications/career-pages" element={<CareerPages />} />
                    <Route path="/projects" element={<SkillGaps />} />
                    <Route path="/projects/list" element={<ProjectList />} />
                    <Route path="/projects/resumes" element={<Resumes />} />
                    <Route path="/setup" element={<Navigate to="/setup/profile" replace />} />
                    <Route path="/setup/profile" element={<Profile />} />
                    <Route path="/setup/connect" element={<Connect />} />
                    {/* Old addresses keep working */}
                    <Route path="/inbound" element={<Navigate to="/applications" replace />} />
                    <Route path="/career-pages" element={<Navigate to="/applications/career-pages" replace />} />
                    <Route path="/drafts" element={<Navigate to="/outbound/contacts" replace />} />
                    <Route path="/assets" element={<Navigate to="/projects/resumes" replace />} />
                    <Route path="/profile" element={<Navigate to="/setup/profile" replace />} />
                    <Route path="/settings" element={<Navigate to="/setup/connect" replace />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                )}
              </main>
              {data && <RightColumn />}
            </div>
          </div>
        </div>
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((t) => (
            <div key={t.id} role="status" aria-live="polite" className="card shadow-lg px-4 py-3 text-sm flex items-center gap-2 border-[#bcd9c6] bg-[#eef6f0] text-[#173d2d]">
              <Cable size={16} className="text-[#0f6b4f]" aria-hidden="true" />{t.msg}
            </div>
          ))}
        </div>
      </DockProvider>
    </Ctx.Provider>
  );
}

function Guard() {
  useLocation(); // re-check the token on every route change
  return auth.token() ? <Shell /> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<Guard />} />
      </Routes>
    </BrowserRouter>
  );
}
