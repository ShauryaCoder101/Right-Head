const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { jdUpload } = require('../middleware/upload');
const { create, list, getById, update, updateWeights, remove } = require('../controllers/jd.controller');

const router = Router();

router.use(authenticateToken);

router.post('/', authorize('RECRUITER', 'ADMIN'), jdUpload, create);
router.get('/', list);
router.get('/:id', getById);
router.put('/:id', authorize('RECRUITER', 'ADMIN'), update);
router.put('/:id/weights', authorize('RECRUITER', 'HIRING_MANAGER', 'ADMIN'), updateWeights);
router.delete('/:id', authorize('RECRUITER', 'ADMIN'), remove);

module.exports = router;
