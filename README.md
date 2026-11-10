# JobHunt OS

**A job-search operating system that runs on your own Claude, with no AI inside.**

Your Claude does the research and writing: finding companies, contacts and openings, reading your résumé, drafting outreach. JobHunt OS does everything else: it stores it, lets you edit it, tracks status and follow-ups, scores your résumé against each JD, works out your skill gaps, and tells you what to do today. It keeps working after the chat ends.

## Three tracks + Today

- **Outbound**: companies → research playbook → contacts (HR / alumni / leader) → drafts → sent → replied, with automatic follow-up dates.
- **Inbound**: openings, programmes and applications on one board, each with a **local ATS score** (keyword match + résumé hygiene checks).
- **Projects**: **gap analysis** for each target role (rule-based skill taxonomy vs your résumé and projects), plus project templates that close the gaps.
- **Today**: one rule-based to-do list across all tracks, plus weekly targets.

## No AI inside

There are no OpenAI, Anthropic or other model SDKs, keys or API calls in this repo. Run `./check-no-ai.sh` to verify. ATS scoring (`api/src/logic/ats.js`), gap analysis (`gaps.js`, `taxonomy.js`) and the Today list (`today.js`) are deterministic rules.

## Connect Claude (MCP)

1. Log in to the web app → **Connect Claude** → copy your personal MCP link (`https://<api>/mcp/<token>`).
2. In Claude: **Settings → Connectors → Add custom connector**. Name it `JobHunt OS`, paste the link, click **Add**.
3. In a new chat, make sure JobHunt OS is switched on in the tools menu.
4. Try: *"Using JobHunt, find 5 Bengaluru fintechs that fit my profile and are hiring, research the best one, find 3 contacts there and draft outreach for each."*

MCP tools: `get_context`, `update_profile`, `add_companies`, `save_company_research`, `add_contacts`, `create_drafts`, `add_openings`, `update_status`, `add_project`, `search_items`. The playbook for each step lives in the tool descriptions.

## Demo account

- Email `demo@jobhunt.app`, password `volopay2026`
- MCP link: `https://<api>/mcp/demo-volopay-7Hq2xK9mPz`

## Stack and deploy

- `api/`: Node 20, Express, Postgres, `@modelcontextprotocol/sdk` (Streamable HTTP, stateless). Deployed on **Render** (`render.yaml` blueprint creates the web service + Postgres).
- `web/`: Vite + React + Tailwind. Deployed on **Vercel** (root `web`, env `VITE_API_URL`).

Env vars (API): `DATABASE_URL`, `JWT_SECRET`, `WEB_URL` (Vercel URL), `API_URL` (Render URL), `TZ=Asia/Kolkata`.

Local dev:
```
cd api && npm i && node src/seed.js && npm start      # :8787
cd web && npm i && npm run dev                        # :5173
```
The demo seed runs once; `node src/seed.js --reset` rebuilds it.
