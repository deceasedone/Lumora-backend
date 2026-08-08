// Lumora-bk/src/controllers/todoController.js

const db = require('../config/db'); // This line now works correctly!

// No helper function is needed. The driver gives us perfect 'YYYY-MM-DD' strings.

// @desc    Get all todos for a user
const getTodos = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new todo
const createTodo = async (req, res) => {
  const { task, date } = req.body;
  const completed = req.body.completed ?? false;

  if (!task) {
    return res.status(400).json({ message: 'Task is required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO todos (user_id, task, completed, date) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, task, completed, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a todo (partial update — only touches fields actually sent)
const updateTodo = async (req, res) => {
  const { id } = req.params;
  const fields = [];
  const values = [];
  let idx = 1;

  if (req.body.task !== undefined) { fields.push(`task = $${idx++}`); values.push(req.body.task); }
  if (req.body.completed !== undefined) { fields.push(`completed = $${idx++}`); values.push(req.body.completed); }
  if (req.body.date !== undefined) { fields.push(`date = $${idx++}`); values.push(req.body.date); }

  if (fields.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  values.push(id, req.user.id);

  try {
    const result = await db.query(
      `UPDATE todos SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Todo not found or user not authorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
};