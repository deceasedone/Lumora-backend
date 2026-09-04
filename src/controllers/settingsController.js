const db = require('../config/db');

// @desc    Read this user's synced settings blob
// @route   GET /api/settings
const getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT data, updated_at FROM user_settings WHERE user_id = $1', [
      req.user.id,
    ]);
    res.json(result.rows[0] ?? { data: {}, updated_at: null });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Merge a partial patch into the settings blob
// @route   PUT /api/settings
const updateSettings = async (req, res) => {
  try {
    const result = await db.query(
      `INSERT INTO user_settings (user_id, data) VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE
         SET data = user_settings.data || EXCLUDED.data,
             updated_at = CURRENT_TIMESTAMP
       RETURNING data, updated_at`,
      [req.user.id, JSON.stringify(req.body)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSettings, updateSettings };
