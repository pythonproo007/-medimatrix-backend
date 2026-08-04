const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  getExpiryAlerts,
  getLowStockAlerts
} = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', getNotifications);
router.put('/mark-read', authMiddleware, markAsRead);
router.get('/expiry-alerts', authMiddleware, getExpiryAlerts);
router.get('/low-stock-alerts', authMiddleware, getLowStockAlerts);

module.exports = router;
