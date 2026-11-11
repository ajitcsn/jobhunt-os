// The "dock": a panel that lives in the right-hand column (no overlay, no backdrop).
// Anything you add or edit opens here, you fill it in, and it saves into the app.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

const DockCtx = createContext(null);
export const useDock = () => useContext(DockCtx);

export function DockProvider({ children }) {
  const [panel, setPanel] = useState(null);
  const { pathname } = useLocation();
  const close = useCallback(() => setPanel(null), []);
  const open = useCallback((title, render) => setPanel({ title, render, id: Date.now() }), []);
  // Navigating to another page closes the dock.
  useEffect(() => { setPanel(null); }, [pathname]);
  return <DockCtx.Provider value={{ panel, open, close }}>{children}</DockCtx.Provider>;
}

export function DockPanel() {
  const { panel, close } = useDock();
  const ref = useRef(null);
  useEffect(() => {
    if (!panel) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    // On narrow screens the dock sits above the page; bring it into view.
    if (window.innerWidth < 1280) window.scrollTo({ top: 0, behavior: 'smooth' });
    else ref.current?.scrollTo?.({ top: 0 });
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, close]);
  if (!panel) return null;
  return (
    <section ref={ref} aria-label={panel.title} className="card border-[#0f6b4f]/40 shadow-[0_0_0_3px_rgba(15,107,79,0.08)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3eae3]">
        <h2 className="font-semibold text-[#143d30]">{panel.title}</h2>
        <button className="btn-ghost !p-1" aria-label="Close panel" onClick={close}><X size={16} /></button>
      </div>
      <div key={panel.id} className="p-4">{panel.render(close)}</div>
    </section>
  );
}
