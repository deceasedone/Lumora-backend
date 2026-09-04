const express = require('express');
const router = express.Router();
const {
  getTodos,
  createTodo,
  updateTodo,
  reorderTodos,
  rolloverTodos,
  getRolloverCount,
  deleteTodo,
} = require('../controllers/todoController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBody, schemas, idParam } = require('../middleware/validate');

router.use(authenticateToken);

router.get('/rollover', getRolloverCount);
router.post('/rollover', validateBody(schemas.rollover), rolloverTodos);
router.put('/reorder', validateBody(schemas.reorder), reorderTodos);

router.route('/')
  .get(getTodos)
  .post(validateBody(schemas.createTodo), createTodo);

router.route('/:id')
  .all(idParam)
  .put(validateBody(schemas.updateTodo), updateTodo)
  .delete(deleteTodo);

module.exports = router;
