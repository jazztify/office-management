const express = require('express');
const router = express.Router();
const accessController = require('../controllers/accessController');
const { jwtAuthMiddleware } = require('../middlewares/jwtAuthMiddleware');

// Hardware might use a dedicated API key or just the standard tenant-scoped auth
// For now, staying consistent with standard auth.
router.use(jwtAuthMiddleware);

router.post('/verify', accessController.verifyAccess);
router.get('/logs', accessController.getAccessLogs);

module.exports = router;
