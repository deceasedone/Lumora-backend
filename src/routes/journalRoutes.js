const express = require('express');
const router = express.Router();
const {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} = require('../controllers/journalController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply the authentication middleware to all routes in this file
router.use(authenticateToken);

// Define the routes
router.route('/')
  .get(getJournalEntries)
  .post(createJournalEntry);

router.route('/:id')
  .put(updateJournalEntry)
  .delete(deleteJournalEntry);

module.exports = router;
