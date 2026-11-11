import { useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../ctx.js';
import { api } from '../api.js';
import { ConfirmButton, CopyButton, McpPrompt, PageHead } from '../ui.jsx';

const TRY = [
  "Here's my resume. Read it and set up my JobHunt profile.",
  'Using JobHunt, find 5 Bengaluru fintechs that fit my profile and are hiring, and add them.',
  'Using JobHunt, research Razorpay, find an HR, an alumni and a leader contact there, and draft outreach for each.',
  'Using JobHunt, find 5 open product analyst roles in Bengaluru and add them with the JD.',
  'Using JobHunt, look at my gaps and add a project that closes the biggest one.',
  'I applied to the Jupiter product analyst role today. Update JobHunt.',
];

export default function Connect() {
  const { me } = useApp();
  const [url, setUrl] = useState(null);
  const mcp = url || me?.mcp_url || '';
  return (
    <div className="space-y-4 max-w-4xl">
      <PageHead title="Connect Claude" sub="JobHunt has no AI inside. Your own Claude does the research and writing; JobHunt stores, organizes and tracks the result." />
      <section className="card p-5">
        <div className="label">Your personal MCP link (keep it private, it works like a password)</div>
        <div className="flex gap-2"><input className="input font-mono text-xs" aria-label="MCP link" readOnly value={mcp} onFocus={(e) => e.target.select()} /><CopyButton text={mcp} className="btn-primary" /></div>
        <div className="mt-2"><ConfirmButton confirmLabel="Click again: the old link stops working" onConfirm={async () => setUrl((await api('/me/rotate-mcp', { method: 'POST' })).mcp_url)}><RefreshCw size={13} />Generate a new link</ConfirmButton></div>
      </section>
      <section className="card p-5">
        <h2 className="font-semibold mb-3">Connect in 4 steps (Claude.ai or Claude desktop)</h2>
        <ol className="space-y-2 text-sm list-decimal pl-5">
          <li>Open Claude, then <b>Settings → Connectors → Add custom connector</b>.</li>
          <li>Name it <b>JobHunt OS</b>, paste your link as the URL, click <b>Add</b>.</li>
          <li>In a new chat, open the <b>+ / tools</b> menu and switch <b>JobHunt OS</b> on.</li>
          <li>Ask for something below. Allow the tool when Claude asks. Results appear here live.</li>
        </ol>
      </section>
      <section className="card p-5">
        <h2 className="font-semibold">How the work is shared</h2>
        <img src="/flowchart.png" alt="Flowchart: your Claude researches and writes, JobHunt OS stores, scores and tracks, and you review, edit and send. Five steps: set direction, find companies, find people, write outreach, track outcomes." className="mt-3 w-full rounded-lg border border-slate-200" />
      </section>
      <section className="card p-5">
        <h2 className="font-semibold mb-3">Things to try</h2>
        <div className="space-y-2">{TRY.map((t) => <McpPrompt key={t} text={t} />)}</div>
      </section>
      <p className="text-xs text-slate-500 flex items-center gap-1.5"><ShieldCheck size={14} />No OpenAI, Anthropic or other AI keys in this app. Scoring, gaps and reminders are plain rules that run on our server.</p>
    </div>
  );
}
