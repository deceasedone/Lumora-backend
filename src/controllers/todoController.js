// Lumora-bk/src/controllers/todoController.js

const db = require('../config/db');

const COLUMNS = `id, user_id, task, completed, date, priority, tags, position,
                 notes, due_time, completed_at, created_at, updated_at`;

// @desc    Get todos, optionally scoped to a date or a tag
const getTodos = async (req, res) => {
  try {
    const params = [req.user.id];
    let where = 'user_id = $1';

    if (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      params.push(req.query.date);
      where += ` AND date = $${params.length}`;
    }
    if (req.query.tag) {
      params.push(req.query.tag);
      where += ` AND $${params.length} = ANY(tags)`;
    }

    const result = await db.query(
      `SELECT ${COLUMNS} FROM todos WHERE ${where}
       ORDER BY date DESC NULLS LAST, position ASC, created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a todo, appended to the end of its day
const createTodo = async (req, res) => {
  const { task, date, priority, tags, notes, dueTime } = req.body;
  const completed = req.body.completed ?? false;

  try {
    const next = await db.query(
      'SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM todos WHERE user_id = $1 AND date IS NOT DISTINCT FROM $2',
      [req.user.id, date ?? null]
    );

    const result = await db.query(
      `INSERT INTO todos (user_id, task, completed, date, priority, tags, position, notes, due_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${COLUMNS}`,
      [
        req.user.id, task, completed, date ?? null,
        priority ?? 0, tags ?? [], next.rows[0].pos,
        notes ?? null, dueTime ?? null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Partial update — only touches fields actually sent
const updateTodo = async (req, res) => {
  const { id } = req.params;
  const fields = [];
  const values = [];
  let idx = 1;

  const set = (col, value) => {
    fields.push(`${col} = $${idx++}`);
    values.push(value);
  };

  if (req.body.task !== undefined) set('task', req.body.task);
  if (req.body.date !== undefined) set('date', req.body.date);
  if (req.body.priority !== undefined) set('priority', req.body.priority);
  if (req.body.tags !== undefined) set('tags', req.body.tags);
  if (req.body.notes !== undefined) set('notes', req.body.notes);
  if (req.body.dueTime !== undefined) set('due_time', req.body.dueTime);
  if (req.body.position !== undefined) set('position', req.body.position);
  if (req.body.completed !== undefined) {
    set('completed', req.body.completed);
    // Keeping the timestamp in step with the flag makes streaks possible later.
    fields.push(`completed_at = ${req.body.completed ? 'NOW()' : 'NULL'}`);
  }

  values.push(id, req.user.id);

  try {
    const result = await db.query(
      `UPDATE todos SET ${fields.join(', ')}
       WHERE id = $${idx++} AND user_id = $${idx++} RETURNING ${COLUMNS}`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Todo not found or user not authorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Persist a drag-and-drop reorder in one transaction
const reorderTodos = async (req, res) => {
  const { order } = req.body;

  try {
    const ids = order.map((o) => o.id);
    const positions = order.map((o) => o.position);

    const result = await db.query(
      `UPDATE todos AS t SET position = v.position
       FROM (SELECT UNNEST($1::int[]) AS id, UNNEST($2::int[]) AS position) AS v
       WHERE t.id = v.id AND t.user_id = $3
       RETURNING t.id`,
      [ids, positions, req.user.id]
    );
    res.json({ updated: result.rowCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Move unfinished tasks from earlier days onto a target date
const rolloverTodos = async (req, res) => {
  const { to } = req.body;

  try {
    const result = await db.query(
      `UPDATE todos SET date = $1
       WHERE user_id = $2 AND completed = FALSE AND date IS NOT NULL AND date < $1
       RETURNING ${COLUMNS}`,
      [to, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Count unfinished tasks left behind on earlier days
const getRolloverCount = async (req, res) => {
  const before = req.query.before;

  try {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM todos
       WHERE user_id = $1 AND completed = FALSE AND date IS NOT NULL AND date < $2`,
      [req.user.id, before]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a todo
const deleteTodo = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Todo not found or user not authorized' });
    }
    res.json({ message: 'Todo removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  reorderTodos,
  rolloverTodos,
  getRolloverCount,
  deleteTodo,
};
