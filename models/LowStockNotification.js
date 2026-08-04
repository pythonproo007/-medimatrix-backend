const mongoose = require('mongoose');

const LowStockNotificationSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  currentQuantity: { type: Number, required: true },
  threshold: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Ordered', 'Restocked'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LowStockNotification', LowStockNotificationSchema);
