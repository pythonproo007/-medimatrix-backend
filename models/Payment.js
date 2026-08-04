const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'UPI / QR', 'Card', 'Credit'], required: true },
  paymentStatus: { type: String, enum: ['Completed', 'Pending', 'Failed', 'Refunded'], default: 'Completed' },
  transactionId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);
