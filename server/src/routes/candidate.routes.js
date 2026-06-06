const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { resumeUpload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { upload, list, getById, update, deleteData, getBatchStatus } = require('../controllers/candidate.controller');

const router = Router();

router.use(authenticateToken);

router.post('/upload', authorize('RECRUITER', 'ADMIN'), uploadLimiter, resumeUpload, upload);
router.get('/', list);
router.get('/batch/:batchId', getBatchStatus);
router.get('/:id', getById);
router.put('/:id', authorize('RECRUITER', 'ADMIN'), update);
router.delete('/:id/data', authorize('RECRUITER', 'ADMIN'), deleteData);

module.exports = router;
