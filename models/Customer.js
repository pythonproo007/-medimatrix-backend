const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, default: '', trim: true },
  address: { type: String, default: '' },
  visitsCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  isRegular: { type: Boolean, default: false },
  discountRate: { type: Number, default: 0 },
  allergies: [{ type: String, trim: true }],
  medicalHistory: { type: String, default: 'None reported' },
  homeDeliveryAddress: { type: String, default: '' },
  autoNotifyDiscounts: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', CustomerSchema);
