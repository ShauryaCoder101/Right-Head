const { Router } = require('express');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = Router();

// Rate limit all API routes
router.use(apiLimiter);

// Mount sub-routers
router.use('/auth', require('./auth.routes'));
router.use('/jd', require('./jd.routes'));
router.use('/candidates', require('./candidate.routes'));
router.use('/scoring', require('./scoring.routes'));
router.use('/export', require('./export.routes'));
router.use('/data-rights', require('./datarights.routes'));
router.use('/notifications', require('./notification.routes'));

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

module.exports = router;
