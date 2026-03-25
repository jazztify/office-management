const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { jwtAuthMiddleware } = require('../middlewares/jwtAuthMiddleware');

router.use(jwtAuthMiddleware);

router.get('/resources', bookingController.getAllResources);
router.post('/resources', bookingController.createResource);
router.post('/', bookingController.createBooking);
router.get('/', bookingController.getTenantBookings);

module.exports = router;
