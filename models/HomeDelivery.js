const mongoose = require('mongoose');

const HomeDeliverySchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  invoiceNo: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  deliveryStatus: { type: String, enum: ['Pending', 'Out for Delivery', 'Delivered', 'Cancelled'], default: 'Pending' },
  deliveryBoyName: { type: String, default: 'Courier Service' },
  deliveryBoyPhone: { type: String, default: '' },
  dispatchedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HomeDelivery', HomeDeliverySchema);
