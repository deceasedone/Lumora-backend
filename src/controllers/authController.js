const db = require('../config/db');
const bcrypt = require('bcrypt');
require('dotenv').config();

const {
  COOKIE_NAME,
  startSession,
  rotateSession,
  revokeSession,
  revokeAllForUser,
} = require('../services/tokenService');

const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email });

const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, password_hash]
    );

    const token = await startSession(res, req, newUser.rows[0].id);
    res.status(201).json({ token, user: publicUser(newUser.rows[0]) });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows.length === 0) {
      // Hash anyway so a missing account and a wrong password take the same time.
      await bcrypt.compare(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = await startSession(res, req, user.id);
    res.status(200).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Exchange the refresh cookie for a new access token
// @route   POST /api/auth/refresh
// @access  Public (the cookie is the credential)
const refresh = async (req, res) => {
  const presented = req.cookies?.[COOKIE_NAME];
  if (!presented) {
    return res.status(401).json({ message: 'No session' });
  }

  try {
    const rotated = await rotateSession(res, req, presented);
    if (!rotated) {
      await revokeSession(res, presented);
      return res.status(401).json({ message: 'Session expired' });
    }

    const user = await db.query('SELECT id, name, email FROM users WHERE id = $1', [rotated.userId]);
    if (user.rows.length === 0) {
      await revokeSession(res, presented);
      return res.status(401).json({ message: 'Session expired' });
    }

    res.json({ token: rotated.accessToken, user: publicUser(user.rows[0]) });
  } catch (error) {
    console.error('Refresh Error:', error);
    res.status(500).json({ message: 'Server error during refresh' });
  }
};

const logout = async (req, res) => {
  try {
    await revokeSession(res, req.cookies?.[COOKIE_NAME]);
  } catch (error) {
    console.error('Logout Error:', error);
  }
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Revoke every session for the signed-in user
// @route   POST /api/auth/logout-all
const logoutAll = async (req, res) => {
  try {
    await revokeAllForUser(req.user.id);
    await revokeSession(res, req.cookies?.[COOKIE_NAME]);
    res.json({ message: 'Signed out everywhere' });
  } catch (error) {
    console.error('Logout-all Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const me = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Me Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Your current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, req.user.id]);

    // A password change should end every other session.
    await revokeAllForUser(req.user.id);
    const token = await startSession(res, req, req.user.id);

    res.json({ token, message: 'Password updated. Other devices have been signed out.' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, created_at',
      [req.body.name, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, refresh, logout, logoutAll, me, changePassword, updateProfile };
