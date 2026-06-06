const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const { run, getResults, rescreen, rerank, getHiddenGems } = require('../controllers/scoring.controller');

const router = Router();

router.use(authenticateToken);

router.post('/run', run);
router.get('/results/:jdId', getResults);
router.post('/rescreen', rescreen);
router.put('/rerank/:jdId', rerank);
router.get('/hidden-gems/:jdId', getHiddenGems);

module.exports = router;
