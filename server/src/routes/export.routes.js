const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const { exportCsv, exportPdf, exportCandidatePdf } = require('../controllers/export.controller');

const router = Router();

router.use(authenticateToken);

router.get('/csv/:jdId', exportCsv);
router.get('/pdf/:jdId', exportPdf);
router.get('/pdf/candidate/:candidateId/:jdId', exportCandidatePdf);

module.exports = router;
