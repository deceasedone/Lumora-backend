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

// @desc    Update a todo
const updateTodo = async (req, res) => {
  const { task, completed, date } = req.body;
  const { id } = req.params;

  try {
    const result = await db.query(
      'UPDATE todos SET task = $1, completed = $2, date = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [task, completed, date, id, req.user.id]
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