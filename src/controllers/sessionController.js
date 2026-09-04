const db = require('../config/db');

// @desc    List focus sessions, newest first
// @route   GET /api/sessions
const getSessions = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const since = req.query.since;
    const params = [req.user.id];
    let where = 'user_id = $1';

    if (since && /^\d{4}-\d{2}-\d{2}$/.test(since)) {
      params.push(since);
      where += ` AND date >= $${params.length}`;
    }
    params.push(limit);

    const result = await db.query(
      `SELECT * FROM focus_sessions WHERE ${where} ORDER BY started_at DESC LIMIT $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Record a finished session. Idempotent on the client-generated id
//          so a retry after a flaky network never double-counts focus time.
// @route   POST /api/sessions
const createSession = async (req, res) => {
  const s = req.body;
  try {
    const result = await db.query(
      `INSERT INTO focus_sessions
         (id, user_id, mode, date, started_at, ended_at, actual_focus_ms,
          total_pause_ms, was_completed, completed_focus_sessions, completed_breaks, label)
       VALUES ($1,$2,$3,$4,to_timestamp($5/1000.0),to_timestamp($6/1000.0),$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         actual_focus_ms = EXCLUDED.actual_focus_ms,
         total_pause_ms = EXCLUDED.total_pause_ms,
         ended_at = EXCLUDED.ended_at,
         was_completed = EXCLUDED.was_completed,
         -- A retry may omit optional fields; never null out what we already stored.
         completed_focus_sessions = COALESCE(EXCLUDED.completed_focus_sessions, focus_sessions.completed_focus_sessions),
         completed_breaks = COALESCE(EXCLUDED.completed_breaks, focus_sessions.completed_breaks),
         label = COALESCE(EXCLUDED.label, focus_sessions.label)
       WHERE focus_sessions.user_id = EXCLUDED.user_id
       RETURNING *`,
      [
        s.id, req.user.id, s.mode, s.date, s.startTime, s.endTime,
        s.actualFocusTime, s.totalPauseTime ?? 0, s.wasCompleted ?? false,
        s.completedFocusSession ?? null, s.completedBreaks ?? null, s.label ?? null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Daily focus totals for the stats view
// @route   GET /api/sessions/summary
const getSummary = async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const result = await db.query(
      `SELECT date,
              SUM(actual_focus_ms)::bigint AS focus_ms,
              COUNT(*)::int AS sessions,
              COALESCE(SUM(completed_focus_sessions), 0)::int AS pomodoros
       FROM focus_sessions
       WHERE user_id = $1 AND date >= CURRENT_DATE - ($2::int - 1)
       GROUP BY date ORDER BY date ASC`,
      [req.user.id, days]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSessions, createSession, getSummary };
