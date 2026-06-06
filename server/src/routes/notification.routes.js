const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const { list, markAsRead, markAllAsRead } = require('../controllers/notification.controller');

const router = Router();

router.use(authenticateToken);

router.get('/', list);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;
