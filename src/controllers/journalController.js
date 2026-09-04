const db = require('../config/db');

// @desc    Get all journal entries for a user
// @route   GET /api/journal
// @access  Private
const getJournalEntries = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const entries = await db.query(
      `SELECT id, title, content, created_at, updated_at
       FROM journal_entries WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json(entries.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a single journal entry
// @route   GET /api/journal/:id
// @access  Private
const getJournalEntry = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new journal entry
// @route   POST /api/journal
// @access  Private
const createJournalEntry = async (req, res) => {
  const { title, content } = req.body;

  try {
    const newEntry = await db.query(
      'INSERT INTO journal_entries (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, title, content]
    );
    res.status(201).json(newEntry.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a journal entry
// @route   PUT /api/journal/:id
// @access  Private
const updateJournalEntry = async (req, res) => {
  const { id } = req.params;
  const fields = [];
  const values = [];
  let idx = 1;

  if (req.body.title !== undefined) { fields.push(`title = $${idx++}`); values.push(req.body.title); }
  if (req.body.content !== undefined) { fields.push(`content = $${idx++}`); values.push(req.body.content); }

  values.push(id, req.user.id);

  try {
    const updatedEntry = await db.query(
      `UPDATE journal_entries SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++} RETURNING *`,
      values
    );

    if (updatedEntry.rows.length === 0) {
      return res.status(404).json({ message: 'Journal entry not found or user not authorized' });
    }

    res.json(updatedEntry.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a journal entry
// @route   DELETE /api/journal/:id
// @access  Private
const deleteJournalEntry = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM journal_entries WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Journal entry not found or user not authorized' });
    }

    res.json({ message: 'Journal entry removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
};
