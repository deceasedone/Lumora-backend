const express = require('express');
const router = express.Router();
const { getSessions, createSession, getSummary } = require('../controllers/sessionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBody, schemas } = require('../middleware/validate');

router.use(authenticateToken);

router.get('/summary', getSummary);
router.route('/')
  .get(getSessions)
  .post(validateBody(schemas.createSession), createSession);

module.exports = router;
