const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['low_stock', 'expiry_alert', 'discount_offer', 'prescription_dispensed', 'system'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recipientPhone: { type: String, default: '' },
  recipientName: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
