-- ============================================================
-- EcchiZone — Full Custom Auth Schema
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ── Users table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active     BOOLEAN DEFAULT true,
  role          VARCHAR(20) DEFAULT 'user'
);

-- ── User sessions table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address INET
);

-- ── User favorites table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_favorites (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  video_slug      VARCHAR(255) NOT NULL,
  video_title     VARCHAR(500),
  video_cover_url TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_slug)
);

-- ── User watch history table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_watch_history (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  video_slug      VARCHAR(255) NOT NULL,
  video_title     VARCHAR(500),
  video_cover_url TEXT,
  series_slug     VARCHAR(255),
  series_title    VARCHAR(500),
  watch_progress  INTEGER DEFAULT 0,
  video_duration  INTEGER DEFAULT 0,
  last_watched    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_slug)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username        ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id      ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires      ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id     ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON user_watch_history(user_id);

-- ── Auto update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
