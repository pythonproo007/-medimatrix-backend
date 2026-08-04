const mongoose = require('mongoose');

const ExpiryNotificationSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  daysRemaining: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Acknowledged', 'Disposed'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ExpiryNotification', ExpiryNotificationSchema);
