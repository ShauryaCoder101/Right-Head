const { Router } = require('express');
const { register, login, refresh, logout } = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimiter');

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;
