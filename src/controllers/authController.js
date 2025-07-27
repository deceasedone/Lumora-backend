const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert new user
    const newUser = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, password_hash]
    );

    // Generate JWT
    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(201).json({ 
      token,
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if user exists
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(200).json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const logout = async (req, res) => {
  // For JWT, logout is handled client-side by deleting the token.
  // Optionally, you could implement token blacklisting here.
  res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = { register, login, logout };
