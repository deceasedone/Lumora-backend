-- Focus sessions were IndexedDB-only, so clearing site data wiped a user's
-- entire history and nothing was visible on a second device.
CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('stopwatch', 'pomodoro', 'countdown')),
    date DATE NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    actual_focus_ms BIGINT NOT NULL DEFAULT 0,
    total_pause_ms BIGINT NOT NULL DEFAULT 0,
    was_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_focus_sessions INTEGER,
    completed_breaks INTEGER,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON focus_sessions (user_id, date DESC);

-- One JSON blob per user: theme, daily goal, timer durations, ambient mix,
-- last wallpaper, world clock cities. Device-local before this.
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
