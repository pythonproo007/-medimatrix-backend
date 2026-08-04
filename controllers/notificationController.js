const Notification = require('../models/Notification');
const ExpiryNotification = require('../models/ExpiryNotification');
const LowStockNotification = require('../models/LowStockNotification');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, unreadCount, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Expiry alerts dashboard panel endpoint
const getExpiryAlerts = async (req, res) => {
  try {
    const alerts = await ExpiryNotification.find().populate('medicineId', 'name code quantity rackLocation').sort({ createdAt: -1 });
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Low stock alerts dashboard panel endpoint
const getLowStockAlerts = async (req, res) => {
  try {
    const alerts = await LowStockNotification.find().populate('medicineId', 'name code quantity rackLocation').sort({ createdAt: -1 });
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  getExpiryAlerts,
  getLowStockAlerts
};
