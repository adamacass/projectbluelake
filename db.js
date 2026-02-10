const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drops (
  id SERIAL PRIMARY KEY,
  slug_hash VARCHAR(128) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  encrypted_content TEXT NOT NULL,
  iv VARCHAR(64) NOT NULL,
  auth_tag VARCHAR(64) NOT NULL,
  has_password BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  max_views INTEGER DEFAULT 1,
  current_views INTEGER DEFAULT 0,
  is_destroyed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  label VARCHAR(255),
  codename VARCHAR(100),
  notify BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drop_events (
  id SERIAL PRIMARY KEY,
  drop_id INTEGER REFERENCES drops(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  ip_hash VARCHAR(128),
  browser VARCHAR(100),
  os VARCHAR(100),
  device_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(100) DEFAULT 'landing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  referrer VARCHAR(1000),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  browser VARCHAR(100),
  os VARCHAR(100),
  device_type VARCHAR(50),
  ip_hash VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_tasks (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  task TEXT NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drops_slug_hash ON drops(slug_hash);
CREATE INDEX IF NOT EXISTS idx_drops_user_id ON drops(user_id);
CREATE INDEX IF NOT EXISTS idx_drops_expires_at ON drops(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
`;

const SEED_MARKETING_TASKS = `
INSERT INTO marketing_tasks (category, task) VALUES
  ('Launch', 'Post to Product Hunt (see marketing/product-hunt-launch.md)'),
  ('Launch', 'Post Show HN on Hacker News (see marketing/hackernews-launch.md)'),
  ('Launch', 'Post to r/SideProject on Reddit'),
  ('Launch', 'Post to r/selfhosted on Reddit'),
  ('Launch', 'Post to r/webdev on Reddit'),
  ('Launch', 'Post to r/Entrepreneur on Reddit'),
  ('Launch', 'Post to r/netsec on Reddit'),
  ('Launch', 'Publish Twitter/X launch thread'),
  ('Launch', 'Publish Dev.to technical article'),
  ('Launch', 'Cross-post to Hashnode and Medium'),
  ('SEO', 'Submit sitemap to Google Search Console'),
  ('SEO', 'Submit sitemap to Bing Webmaster Tools'),
  ('SEO', 'Set up Google Analytics'),
  ('SEO', 'Write blog post: 5 Ways Devs Leak API Keys'),
  ('SEO', 'Write blog post: How to Share Passwords Securely in 2026'),
  ('SEO', 'Write blog post: PrivNote Alternatives 2026'),
  ('SEO', 'Answer Quora questions about password sharing'),
  ('Outreach', 'Start cold outreach - 10 emails/day (see marketing/cold-outreach.md)'),
  ('Outreach', 'Join 3 relevant Slack/Discord communities'),
  ('Outreach', 'Post on IndieHackers community'),
  ('Outreach', 'Reach out to 5 DevOps bloggers for reviews'),
  ('Outreach', 'Contact 3 security newsletters for inclusion'),
  ('Ads', 'Set up Google AdSense and get approved'),
  ('Ads', 'Optimize ad placements based on first week data'),
  ('Growth', 'Hit 100 registered users'),
  ('Growth', 'Hit 1,000 drops created'),
  ('Growth', 'Hit 5,000 monthly page views'),
  ('Growth', 'Hit first $100 in ad revenue')
ON CONFLICT DO NOTHING;
`;

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    const count = await client.query('SELECT COUNT(*) FROM marketing_tasks');
    if (parseInt(count.rows[0].count) === 0) {
      await client.query(SEED_MARKETING_TASKS);
    }
    console.log('[DB] Schema initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
