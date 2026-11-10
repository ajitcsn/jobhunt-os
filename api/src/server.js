import express from 'express';
import cors from 'cors';
import { migrate } from './db.js';
import routes from './routes.js';
import { mountMcp } from './mcp.js';

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: true, exposedHeaders: ['Mcp-Session-Id'] }));
app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => res.type('text').send('JobHunt OS API + MCP server. No AI inside: Claude connects via MCP at /mcp/<your-token>.'));
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use('/api', routes);
mountMcp(app);

const port = process.env.PORT || 8787;
await migrate();
app.listen(port, () => console.log(`JobHunt API on :${port}`));
