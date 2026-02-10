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
  plan VARCHAR(50) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  drops_today INTEGER DEFAULT 0,
  drops_today_reset DATE DEFAULT CURRENT_DATE,
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
  notify BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drop_events (
  id SERIAL PRIMARY KEY,
  drop_id INTEGER REFERENCES drops(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  ip_hash VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drops_slug_hash ON drops(slug_hash);
CREATE INDEX IF NOT EXISTS idx_drops_user_id ON drops(user_id);
CREATE INDEX IF NOT EXISTS idx_drops_expires_at ON drops(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
`;

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    console.log('[DB] Schema initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
