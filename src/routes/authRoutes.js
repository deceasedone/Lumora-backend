const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  changePassword,
  updateProfile,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBody, schemas } = require('../middleware/validate');
const { authLimiter, refreshLimiter } = require('../middleware/rateLimit');

router.post('/register', authLimiter, validateBody(schemas.register), register);
router.post('/login', authLimiter, validateBody(schemas.login), login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', authenticateToken, logoutAll);
router.get('/me', authenticateToken, me);
router.put('/me', authenticateToken, validateBody(schemas.updateProfile), updateProfile);
router.post('/change-password', authenticateToken, authLimiter, validateBody(schemas.changePassword), changePassword);

module.exports = router;
