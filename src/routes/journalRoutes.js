const express = require('express');
const router = express.Router();
const {
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} = require('../controllers/journalController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBody, schemas, idParam } = require('../middleware/validate');

router.use(authenticateToken);

router.route('/')
  .get(getJournalEntries)
  .post(validateBody(schemas.createJournal), createJournalEntry);

router.route('/:id')
  .all(idParam)
  .get(getJournalEntry)
  .put(validateBody(schemas.updateJournal), updateJournalEntry)
  .delete(deleteJournalEntry);

module.exports = router;
