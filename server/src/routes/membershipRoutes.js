const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');
const { jwtAuthMiddleware } = require('../middlewares/jwtAuthMiddleware');
const { authorize } = require('../middlewares/authMiddleware');

router.use(jwtAuthMiddleware);

router.get('/tiers', membershipController.getAllTiers);
router.post('/tiers', authorize(['ADMIN', 'SUPER_ADMIN']), membershipController.createTier);
router.put('/tiers/:id', authorize(['ADMIN', 'SUPER_ADMIN']), membershipController.updateTier);
router.post('/register', authorize(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), membershipController.registerMember);
router.post('/assign', authorize(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), membershipController.assignMembership);

module.exports = router;
