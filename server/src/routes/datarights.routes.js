const { Router } = require('express');
const { lookup, verify, verifyDataRightsToken, getData, deleteData, updateConsent } = require('../controllers/datarights.controller');

const router = Router();

// Public routes — no auth required
router.post('/lookup', lookup);
router.post('/verify', verify);

// Token-protected routes
router.get('/data/:token', verifyDataRightsToken, getData);
router.delete('/delete/:token', verifyDataRightsToken, deleteData);
router.put('/consent/:token', verifyDataRightsToken, updateConsent);

module.exports = router;
