import { useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../App.jsx';
import { api } from '../api.js';
import { PageHead, CopyButton, ClaudePrompt } from '../ui.jsx';

const TRY = [
  "Here's my résumé. Read it and set up my JobHunt profile.",
  'Using JobHunt, find 5 Bengaluru fintechs that fit my profile and are hiring, and add them.',
  'Using JobHunt, research Razorpay, find an HR, an alumni and a leader contact there, and draft outreach for each.',
  'Using JobHunt, find 5 open product analyst roles in Bengaluru and add them with the JD.',
  'Using JobHunt, look at my gaps and add a project that closes the biggest one.',
  'I applied to the Jupiter product analyst role today. Update JobHunt.',
];

export default function Settings() {
  const { me } = useApp();
  const [url, setUrl] = useState(null);
  const mcp = url || me?.mcp_url || '';
  return (
    <div className="max-w-3xl">
      <PageHead title="Connect your Claude" sub="JobHunt has no AI inside. Your own Claude does the research and writing, and saves results here through this private link." />
      <section className="card p-5">
        <div className="label">Your personal MCP link (keep it private, it works like a password)</div>
        <div className="flex gap-2">
          <input className="input font-mono text-xs" readOnly value={mcp} onFocus={(e) => e.target.select()} />
          <CopyButton text={mcp} className="btn-primary" />
        </div>
        <button className="btn-ghost mt-2 text-xs" onClick={async () => { if (confirm('The old link will stop working. Continue?')) setUrl((await api('/me/rotate-mcp', { method: 'POST' })).mcp_url); }}>
          <RefreshCw size={13} />Generate a new link
        </button>
      </section>

      <section className="card p-5 mt-4">
        <h2 className="font-semibold mb-3">Connect in 4 steps (claude.ai or Claude desktop)</h2>
        <ol className="space-y-2 text-sm list-decimal pl-5">
          <li>Open Claude → <b>Settings → Connectors</b> → <b>Add custom connector</b>.</li>
          <li>Name it <b>JobHunt OS</b> and paste your link above as the URL. Click <b>Add</b>.</li>
          <li>In a new chat, open the <b>+ / tools</b> menu and make sure <b>JobHunt OS</b> is switched on.</li>
          <li>Ask for something below. Allow the tool when Claude asks. Results show up here live.</li>
        </ol>
      </section>

      <section className="card p-5 mt-4">
        <h2 className="font-semibold mb-3">Things to try</h2>
        <div className="space-y-2">{TRY.map((t) => <ClaudePrompt key={t} text={t} />)}</div>
      </section>

      <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5"><ShieldCheck size={14} />No OpenAI, Anthropic or other AI keys in this app. Scoring, gaps and reminders are plain rules that run on our server.</p>
    </div>
  );
}
