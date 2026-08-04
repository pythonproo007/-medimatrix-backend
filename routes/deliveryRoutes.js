const express = require('express');
const router = express.Router();
const { getHomeDeliveries, updateDeliveryStatus } = require('../controllers/deliveryController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getHomeDeliveries);
router.put('/:id/status', authMiddleware, updateDeliveryStatus);

module.exports = router;
