-- Every list query filters by user_id; the todo views also filter by date.
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos (user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_date ON todos (user_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_user_created ON journal_entries (user_id, created_at DESC);

-- Emails are matched case-insensitively at the app layer; enforce it here too.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
