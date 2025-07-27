const db = require('../config/db');

// @desc    Get all journal entries for a user
// @route   GET /api/journal
// @access  Private
const getJournalEntries = async (req, res) => {
  try {
    const entries = await db.query(
      'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(entries.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new journal entry
// @route   POST /api/journal
// @access  Private
const createJournalEntry = async (req, res) => {
  const { title, content } = req.body;
  if (!title || content == null) { // content can be an empty string for a new entry
    return res.status(400).json({ message: 'Title and content are required' });
  }

  try {
    const newEntry = await db.query(
      'INSERT INTO journal_entries (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, title, content]
    );
    res.status(201).json(newEntry.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a journal entry
// @route   PUT /api/journal/:id
// @access  Private
const updateJournalEntry = async (req, res) => {
  const { title, content } = req.body;
  const { id } = req.params;

  try {
    const updatedEntry = await db.query(
      'UPDATE journal_entries SET title = $1, content = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [title, content, id, req.user.id]
    );

    if (updatedEntry.rows.length === 0) {
      return res.status(404).json({ message: 'Journal entry not found or user not authorized' });
    }

    res.json(updatedEntry.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
};
