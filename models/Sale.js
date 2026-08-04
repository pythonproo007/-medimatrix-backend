const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String, default: 'Walk-in Customer' },
  customerPhone: { type: String, default: '' },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
  doctorName: { type: String, default: '' },
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'UPI / QR', 'Card', 'Credit'], default: 'Cash' },
  isRegularCustomerDiscountApplied: { type: Boolean, default: false },
  appliedPromoCode: { type: String, default: '' },
  isHomeDelivery: { type: Boolean, default: false },
  deliveryAddress: { type: String, default: '' },
  deliveryStatus: { type: String, enum: ['N/A', 'Pending', 'Out for Delivery', 'Delivered', 'Cancelled'], default: 'N/A' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sale', SaleSchema);
