-- Todos were a flat row: task, completed, date. Everything below is additive
-- and nullable/defaulted, so existing rows keep working untouched.
ALTER TABLE todos ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE todos ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_time TIME;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 0 = none, 1 = low, 2 = medium, 3 = high
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_priority_range;
ALTER TABLE todos ADD CONSTRAINT todos_priority_range CHECK (priority BETWEEN 0 AND 3);

CREATE INDEX IF NOT EXISTS idx_todos_user_position ON todos (user_id, date, position);
CREATE INDEX IF NOT EXISTS idx_todos_tags ON todos USING GIN (tags);

-- Seed a stable manual order from the existing creation order.
UPDATE todos t SET position = s.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, date ORDER BY created_at) AS rn
  FROM todos
) s
WHERE t.id = s.id AND t.position = 0;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS todos_touch_updated_at ON todos;
CREATE TRIGGER todos_touch_updated_at
BEFORE UPDATE ON todos
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
