import pg from 'pg';

// Postgres returns DATE as a JS Date in local tz by default; keep it as 'YYYY-MM-DD' text.
pg.types.setTypeParser(1082, (v) => v);

const conn = process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/jobhunt?host=/tmp';
export const pool = new pg.Pool({
  connectionString: conn,
  ssl: /render\.com|neon\.tech|sslmode=require/.test(conn) ? { rejectUnauthorized: false } : undefined,
});

export const q = async (text, params = []) => (await pool.query(text, params)).rows;
export const one = async (text, params = []) => (await pool.query(text, params)).rows[0] || null;

export const SCHEMA = `
create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  name text,
  mcp_token text unique not null,
  created_at timestamptz default now()
);
create table if not exists profiles (
  user_id int primary key references users(id) on delete cascade,
  headline text, location text, years_exp numeric, education text, college text,
  target_roles text[] default '{}', target_locations text[] default '{}', target_company_types text[] default '{}',
  weekly_outreach_target int default 10, weekly_applications_target int default 5,
  resume_text text default '', skills text[] default '{}', links jsonb default '{}',
  onboarded boolean default false,
  updated_at timestamptz default now()
);
create table if not exists companies (
  id serial primary key, user_id int not null references users(id) on delete cascade,
  name text not null, website text, sector text, stage text, location text, fit_reason text,
  status text default 'shortlisted', priority int default 2, source text default 'manual',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists company_research (
  company_id int primary key references companies(id) on delete cascade,
  summary text, why_fit text, recent_news text, hiring_signals text, outreach_angles text,
  sources jsonb default '[]', source text default 'manual', updated_at timestamptz default now()
);
create table if not exists contacts (
  id serial primary key, user_id int not null references users(id) on delete cascade,
  company_id int references companies(id) on delete cascade,
  name text not null, role_title text, type text default 'other', linkedin_url text, email text, notes text,
  status text default 'new', source text default 'manual',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists drafts (
  id serial primary key, user_id int not null references users(id) on delete cascade,
  contact_id int references contacts(id) on delete cascade,
  channel text default 'email', subject text, body text, status text default 'draft',
  sent_at date, follow_up_on date, follow_up_count int default 0, source text default 'manual',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists openings (
  id serial primary key, user_id int not null references users(id) on delete cascade,
  company_id int references companies(id) on delete set null,
  title text not null, url text, location text, deadline date, jd_text text default '',
  ats_score int, ats_matched text[] default '{}', ats_missing text[] default '{}', ats_checks jsonb default '[]',
  stage text default 'saved', applied_on date, notes text, source text default 'manual',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists projects (
  id serial primary key, user_id int not null references users(id) on delete cascade,
  title text not null, target_role text, skills_covered text[] default '{}', description text,
  status text default 'idea', milestones jsonb default '[]', link text, source text default 'manual',
  last_activity_at timestamptz default now(),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists activity_log (
  id serial primary key, user_id int not null references users(id) on delete cascade,
  entity_type text, entity_id int, action text, label text, source text, at timestamptz default now()
);
create table if not exists today_done (
  user_id int references users(id) on delete cascade, key text, until date,
  primary key (user_id, key)
);
`;

export async function migrate() {
  await pool.query(SCHEMA);
}

export async function log(userId, entity_type, entity_id, action, label, source = 'manual') {
  await q(
    'insert into activity_log (user_id, entity_type, entity_id, action, label, source) values ($1,$2,$3,$4,$5,$6)',
    [userId, entity_type, entity_id, action, label, source]
  );
}
