export const API = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } };

export const auth = {
  token: () => get('jh_token'),
  save: (t) => set('jh_token', t),
  clear: () => set('jh_token', null),
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { Authorization: `Bearer ${auth.token() || ''}` };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}/api${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth')) {
    auth.clear();
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const fmtDate = (d) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
