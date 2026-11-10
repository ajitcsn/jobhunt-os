import { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, X } from 'lucide-react';

export function ClaudeBadge({ source }) {
  if (source !== 'claude') return null;
  return <span className="chip bg-violet-100 text-violet-700 gap-1"><Sparkles size={11} />via Claude</span>;
}

const TYPE_STYLE = {
  hr: 'bg-sky-100 text-sky-700', alumni: 'bg-amber-100 text-amber-800', leader: 'bg-emerald-100 text-emerald-700', other: 'bg-slate-100 text-slate-600',
};
export const TypeBadge = ({ type }) => <span className={`chip ${TYPE_STYLE[type] || TYPE_STYLE.other}`}>{type === 'hr' ? 'HR' : type}</span>;

const STATUS_STYLE = {
  shortlisted: 'bg-slate-100 text-slate-600', researched: 'bg-indigo-100 text-indigo-700', contacted: 'bg-sky-100 text-sky-700', archived: 'bg-slate-100 text-slate-400',
  new: 'bg-slate-100 text-slate-600', drafted: 'bg-amber-100 text-amber-800', sent: 'bg-sky-100 text-sky-700', replied: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-100 text-slate-400',
  draft: 'bg-amber-100 text-amber-800',
  idea: 'bg-slate-100 text-slate-600', in_progress: 'bg-indigo-100 text-indigo-700', done: 'bg-emerald-100 text-emerald-700',
};
export const StatusBadge = ({ s }) => <span className={`chip ${STATUS_STYLE[s] || 'bg-slate-100'}`}>{String(s).replace('_', ' ')}</span>;

export function AtsBadge({ score }) {
  if (score === null || score === undefined) return <span className="chip bg-slate-100 text-slate-400">ATS –</span>;
  const c = score >= 75 ? 'bg-emerald-100 text-emerald-700' : score >= 55 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700';
  return <span className={`chip ${c}`}>ATS {score}</span>;
}

export function CopyButton({ text, label = 'Copy', className = 'btn-outline' }) {
  const [done, setDone] = useState(false);
  return (
    <button className={className} onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? <Check size={14} /> : <Copy size={14} />}{done ? 'Copied' : label}
    </button>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/30 flex items-start justify-center p-4 pt-[10vh]" onMouseDown={onClose}>
      <div className="card w-full max-w-lg p-5 shadow-xl max-h-[80vh] overflow-auto" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button className="btn-ghost !p-1" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Simple form builder: fields = [{k, label, type: text|textarea|select|date|number, options}]
export function Form({ fields, initial = {}, onSubmit, submitLabel = 'Save' }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr('');
      try { await onSubmit(v); } catch (x) { setErr(x.message); } finally { setBusy(false); }
    }}>
      {fields.map((f) => (
        <div key={f.k}>
          <label className="label">{f.label}{f.required && ' *'}</label>
          {f.type === 'textarea' ? (
            <textarea className="input min-h-[90px]" rows={f.rows || 4} value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} required={f.required} placeholder={f.placeholder} />
          ) : f.type === 'select' ? (
            <select className="input" value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} required={f.required}>
              {!f.required && <option value="">—</option>}
              {f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
            </select>
          ) : (
            <input className="input" type={f.type || 'text'} value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })} required={f.required} placeholder={f.placeholder} />
          )}
        </div>
      ))}
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <div className="flex justify-end"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div>
    </form>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="card p-8 text-center text-slate-500">
      {Icon && <Icon className="mx-auto mb-2 text-slate-300" size={28} />}
      <p className="font-medium text-slate-700">{title}</p>
      <div className="text-sm mt-1">{children}</div>
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function ClaudePrompt({ text }) {
  return (
    <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm flex items-start gap-2">
      <Sparkles size={16} className="text-violet-600 mt-0.5 shrink-0" />
      <div className="flex-1 text-violet-900">“{text}”</div>
      <CopyButton text={text} label="Copy" className="btn-ghost !py-0.5 text-violet-700" />
    </div>
  );
}
