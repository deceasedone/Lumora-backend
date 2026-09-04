const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBody, schemas } = require('../middleware/validate');

router.use(authenticateToken);

router.route('/')
  .get(getSettings)
  .put(validateBody(schemas.updateSettings), updateSettings);

module.exports = router;
