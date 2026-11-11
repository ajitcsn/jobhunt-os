import { useEffect, useRef, useState } from 'react';
import { Cable, Copy, Check, Plus } from 'lucide-react';

// Brand mark: a "j" whose dot is a target. Same artwork as /favicon.svg.
export function LogoMark({ size = 28, className = '' }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label="JobHunt OS">
      <rect width="64" height="64" rx="15" fill="#0f6b4f" />
      <circle cx="42" cy="15" r="9" fill="none" stroke="#f4c35a" strokeWidth="3" />
      <circle cx="42" cy="15" r="3.6" fill="#f4c35a" />
      <path d="M42 29V40a11 11 0 0 1-11 11h-2a10 10 0 0 1-9-6" fill="none" stroke="#fff" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function McpBadge({ source }) {
  if (source !== 'claude') return null;
  return <span className="chip bg-emerald-100 text-emerald-800 gap-1"><Cable size={11} aria-hidden="true" />via MCP</span>;
}

const TYPE_STYLE = {
  hr: 'bg-sky-100 text-sky-700', alumni: 'bg-amber-100 text-amber-800', leader: 'bg-emerald-100 text-emerald-700', other: 'bg-slate-100 text-slate-600',
};
export const TypeBadge = ({ type }) => <span className={`chip ${TYPE_STYLE[type] || TYPE_STYLE.other}`}>{type === 'hr' ? 'HR' : type}</span>;

const STATUS_STYLE = {
  shortlisted: 'bg-slate-100 text-slate-600', researched: 'bg-emerald-100 text-emerald-800', contacted: 'bg-sky-100 text-sky-700', archived: 'bg-slate-100 text-slate-400',
  new: 'bg-slate-100 text-slate-600', drafted: 'bg-amber-100 text-amber-800', sent: 'bg-sky-100 text-sky-700', replied: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-100 text-slate-400',
  draft: 'bg-amber-100 text-amber-800',
  saved: 'bg-slate-100 text-slate-600', applied: 'bg-sky-100 text-sky-700', interview: 'bg-emerald-100 text-emerald-800', offer: 'bg-emerald-100 text-emerald-800', rejected: 'bg-rose-100 text-rose-700', ghosted: 'bg-slate-100 text-slate-500',
  idea: 'bg-slate-100 text-slate-600', in_progress: 'bg-emerald-100 text-emerald-800', done: 'bg-emerald-100 text-emerald-700',
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

// Two-step delete without a browser pop-up: first click arms it, second click confirms.
export function ConfirmButton({ onConfirm, children, confirmLabel = 'Click again to delete', className = 'btn-ghost !text-slate-400' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return armed
    ? <button className="btn bg-rose-600 text-white hover:bg-rose-700" onClick={() => { setArmed(false); onConfirm(); }}>{confirmLabel}</button>
    : <button className={className} onClick={() => setArmed(true)}>{children}</button>;
}

// Dock form builder. fields = [{k, label, type: text|textarea|select|date|number|checkbox|chips, options}]
export function Form({ fields, initial = {}, onSubmit, submitLabel = 'Save' }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }));
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr('');
      try { await onSubmit(v); } catch (x) { setErr(x.message); } finally { setBusy(false); }
    }}>
      {fields.map((f) => (
        <div key={f.k}>
          <label className="label" htmlFor={`field-${f.k}`}>{f.label}{f.required && ' *'}</label>
          {f.type === 'textarea' ? (
            <textarea id={`field-${f.k}`} name={f.k} className="input min-h-[90px]" rows={f.rows || 4} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)} required={f.required} placeholder={f.placeholder} />
          ) : f.type === 'select' ? (
            <select id={`field-${f.k}`} name={f.k} className="input" value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)} required={f.required}>
              {!f.required && <option value="">—</option>}
              {f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
            </select>
          ) : f.type === 'checkbox' ? (
            <label className="flex items-center gap-2 text-sm"><input id={`field-${f.k}`} type="checkbox" checked={!!v[f.k]} onChange={(e) => set(f.k, e.target.checked)} />{f.checkLabel}</label>
          ) : f.type === 'chips' ? (
            <div className="flex flex-wrap gap-1.5" id={`field-${f.k}`}>
              {f.options.map((o) => {
                const on = (v[f.k] || []).includes(o.value);
                return <button type="button" key={o.value} aria-pressed={on} onClick={() => set(f.k, on ? v[f.k].filter((x) => x !== o.value) : [...(v[f.k] || []), o.value])}
                  className={`chip !px-2.5 !py-1 border ${on ? 'bg-[#0f6b4f] text-white border-[#0f6b4f]' : 'bg-white text-slate-600 border-slate-300 hover:border-[#0f6b4f]'}`}>{o.label}</button>;
              })}
            </div>
          ) : (
            <input id={`field-${f.k}`} name={f.k} className="input" type={f.type || 'text'} value={v[f.k] ?? ''} onChange={(e) => set(f.k, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} required={f.required} placeholder={f.placeholder} />
          )}
        </div>
      ))}
      {err && <p className="text-sm text-rose-600" role="alert">{err}</p>}
      <div className="flex justify-end"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div>
    </form>
  );
}

// Fast inline add for CRM tables: type, press Enter, the row appears. No pop-up, no panel.
export function QuickAdd({ fields, onAdd, cta = 'Add', hint }) {
  const blank = () => Object.fromEntries(fields.map((f) => [f.k, f.default ?? '']));
  const [v, setV] = useState(blank);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await onAdd(v); setV(blank()); first.current?.focus(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card p-3">
      <div className="flex flex-wrap gap-2 items-end">
        {fields.map((f, i) => (
          <div key={f.k} className={f.w || 'flex-1 min-w-[8.5rem]'}>
            <label className="label" htmlFor={`qa-${f.k}`}>{f.label}</label>
            {f.type === 'select' ? (
              <select id={`qa-${f.k}`} className="input" value={v[f.k]} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} required={f.required}>
                {(f.blank !== false) && <option value="">{f.placeholder || '—'}</option>}
                {f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
              </select>
            ) : (
              <>
                <input id={`qa-${f.k}`} ref={i === 0 ? first : undefined} className="input" type={f.type === 'combo' ? 'text' : f.type || 'text'} list={f.type === 'combo' ? `qa-list-${f.k}` : undefined}
                  value={v[f.k]} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} required={f.required} placeholder={f.placeholder} autoComplete="off" />
                {f.type === 'combo' && <datalist id={`qa-list-${f.k}`}>{f.options.map((o) => <option key={o} value={o} />)}</datalist>}
              </>
            )}
          </div>
        ))}
        <button className="btn-primary" disabled={busy}><Plus size={14} />{cta}</button>
      </div>
      {(err || hint) && <p className={`text-xs mt-2 ${err ? 'text-rose-600' : 'text-slate-500'}`} role={err ? 'alert' : undefined}>{err || hint}</p>}
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
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function McpPrompt({ text }) {
  return (
    <div className="rounded-lg bg-[#eef6f0] border border-[#cde3d4] p-3 text-sm flex items-start gap-2">
      <Cable size={16} className="text-[#0f6b4f] mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 text-[#173d2d]">{text}</div>
      <CopyButton text={text} label="Copy" className="btn-ghost !py-0.5 text-[#0f6b4f]" />
    </div>
  );
}
