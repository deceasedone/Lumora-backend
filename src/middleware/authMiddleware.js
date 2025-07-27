const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expects "Bearer TOKEN"

  if (token == null) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.status(403).json({ message: 'Token is not valid' });
    }
    req.user = user; // Attach user payload (e.g., { id: 'user-uuid', iat: ..., exp: ... })
    next();
  });
};

module.exports = { authenticateToken };
